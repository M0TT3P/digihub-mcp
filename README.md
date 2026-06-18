# digihub-mcp

Model Context Protocol server for the [digihub.li](https://digihub.li) content API.

Lets Claude (Desktop, Code, or any other MCP-aware client) read and write **Stories**, **Solutions** and **Sessions** on the digihub.li site, and upload images that can be used as hero images or inline media.

> **Status:** alpha — works against production, but the package isn't on the npm registry yet. Install from git for now (see below). Once we tag a release the published version takes over.

---

## Quick start

### 1. Get a token

API access is gated by a Sanctum personal access token issued by an admin on the digihub.li site. Ask the digihub-admin (Stefan) for one, or generate it yourself if you have shell access to the Dokploy container:

```bash
php artisan api:token make you@example.com \
    --name="claude-mcp" \
    --ability=stories:read --ability=stories:write \
    --ability=solutions:read --ability=solutions:write \
    --ability=sessions:read --ability=sessions:write \
    --ability=media:write
```

The plain-text token is shown **once**. Copy it immediately into your password manager. Format: `<id>|<secret>` — e.g. `2|abcDEF...`.

`--ability=*` grants every permission. For a contributor who should only push news posts, narrow to `stories:read stories:write media:write`.

### 2. Install the MCP server

Until the npm package is published, clone the repo:

```bash
git clone https://github.com/M0TT3P/digihub-mcp.git
cd digihub-mcp
npm install
npm run build
```

The compiled entry point is `dist/index.js`. Once we publish:

```bash
# future
npx -y @m0tt3p/digihub-mcp@latest
```

### 3. Wire it into your client

**Claude Desktop** (`%APPDATA%\Claude\claude_desktop_config.json` on Windows, `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "digihub": {
      "command": "node",
      "args": ["C:/absolute/path/to/digihub-mcp/dist/index.js"],
      "env": {
        "DIGIHUB_BASE_URL": "https://digihub.li",
        "DIGIHUB_API_TOKEN": "<paste-your-token>"
      }
    }
  }
}
```

**Claude Code** (`.mcp.json` in your project, or via `claude mcp add`):

```json
{
  "mcpServers": {
    "digihub": {
      "command": "node",
      "args": ["/absolute/path/to/digihub-mcp/dist/index.js"],
      "env": {
        "DIGIHUB_BASE_URL": "https://digihub.li",
        "DIGIHUB_API_TOKEN": "<paste-your-token>"
      }
    }
  }
}
```

Restart the client, then prompt: *"Use digihub.whoami and tell me what abilities the token has."* If you see your name and the ability list, you're live.

---

## Environment variables

| Variable | Required | Example | Notes |
|---|---|---|---|
| `DIGIHUB_BASE_URL` | yes | `https://digihub.li` | Site root, no trailing slash needed. For the staging instance use `https://digihub.laggner.li`. |
| `DIGIHUB_API_TOKEN` | yes | `2|abc...` | Sanctum token from `php artisan api:token make`. |

---

## Tools exposed

### Stories

| Tool | What it does |
|---|---|
| `list_stories` | Paginated list. Filters: `status`, `format`, `pillar_id`, `featured`, `per_page` (max 100), `page`. |
| `get_story` | Fetch a single story by slug. |
| `create_story` | Create a new story. |
| `update_story` | PATCH an existing story (slug-based). Only pass fields you want to change. |
| `delete_story` | Soft-delete by slug. |

**Required on create:** `slug`, `title.de` or `title.en`, `lead.de` or `lead.en`, `format`.

Formats: `news`, `case_study`, `newsletter`, `use_case`, `success_story`.

### Solutions

Same shape as Stories, minus `format`/`related_links`, plus `summary`, `business_areas`, `target_audiences`, `cta_link`, `icon`, `sort_order`.

### Sessions (events)

| Tool | What it does |
|---|---|
| `list_sessions` | Filters: `status`, `format`, `pillar_id`, `upcoming` (true → starts_at ≥ now). |
| `get_session`, `create_session`, `update_session`, `delete_session` | CRUD by slug. |

**Required on create:** `slug`, `title`, `summary`, `format`, `starts_at` (ISO datetime).

Session status enum: `draft`, `published`, `archived`, `cancelled`.

### Media

| Tool | What it does |
|---|---|
| `upload_media` | Provide `file` (local path) or `url` (server fetches it). Optional `subdir`: `uploads`, `stories`, `solutions`, `sessions`. Returns `{ url, extension, size }`. The `url` you get back is what you put into `hero_image` or `media[].url` on a subsequent call. |

Allowed file types: `jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`, `svg`, `pdf`. Max 25 MB.

### Self

| Tool | What it does |
|---|---|
| `whoami` | Returns `{ id, name, email, abilities }`. Useful first call to verify the token and see what you're allowed to do. |

---

## Reference data

### Pillars

| `pillar_id` | `key` | Title |
|---|---|---|
| `1` | `lab` | AI Lab |
| `2` | `hub` | Coworking Hub |
| `3` | `fund` | Förderprogramme / Funding Programs |

Pass `pillar_id` (integer) on create/update. The pillar relation is auto-loaded into responses.

### Tag types

Tags are grouped by `type`:

- `business_area` — `lab`, `hub`, `fund`
- `audience` — `kmu`, `verwaltung`, `startup`, `finanzdienstleister`, `industrie`
- `topic` — `ai`, `datenschutz`, …

Pass `tag_slugs: ["ai", "kmu"]` to attach. Only existing slugs are accepted — the API rejects unknown ones.

---

## Example: create a story end-to-end

```jsonc
// 1. Upload an image (from local path)
{
  "tool": "upload_media",
  "args": {
    "file": "C:/Users/me/Pictures/hero.jpg",
    "subdir": "stories"
  }
}
// → { "url": "/storage/stories/a1b2c3d4e5.jpg", ... }

// 2. Create the story, referencing that URL
{
  "tool": "create_story",
  "args": {
    "slug": "ki-workshop-im-mai",
    "pillar_id": 1,
    "title": { "de": "KI-Workshop im Mai", "en": "AI Workshop in May" },
    "lead": { "de": "Drei Stunden Hands-on mit echten KMU-Use-Cases." },
    "body": { "de": "# Über den Workshop\n\nMarkdown wird auf der Story-Detail-Seite gerendert ..." },
    "format": "news",
    "hero_image": "/storage/stories/a1b2c3d4e5.jpg",
    "author_name": "digihub.li Team",
    "tag_slugs": ["ai", "kmu"],
    "featured": true,
    "status": "published",
    "published_at": "2026-05-01T08:00:00Z"
  }
}
```

Translations are key-value maps with `de` and/or `en`. At least one of the two must be present on create. `body` accepts Markdown — it's rendered server-side via Laravel's CommonMark.

---

## Abilities

Abilities are `{resource}:{operation}`:

- `stories:read`, `stories:write`, `stories:delete`
- `solutions:read`, `solutions:write`, `solutions:delete`
- `sessions:read`, `sessions:write`, `sessions:delete`
- `media:write`

Each tool checks its own ability — `list_stories` requires `stories:read`, `create_story` requires `stories:write`, etc. Updates also require `stories:write`. Soft-deletes require `stories:delete` (separate from write so editors can be allowed to publish but not destroy).

Issue tokens with only the abilities the holder actually needs.

---

## Errors you might hit

| Symptom | Cause | Fix |
|---|---|---|
| `whoami` returns 401 | Token missing or revoked | Generate a new token, update env var |
| Tool returns "403" | Token lacks the ability | Generate a new token with the missing ability, or ask admin |
| `create_story` returns 422 with `slug` | Slug not unique or wrong shape | Slugs are lowercase letters, digits, and dashes only |
| `create_story` returns 422 with `tag_slugs` | Unknown tag slug | Use only existing tags (see Reference data above), or create the tag in the admin first |
| Image is uploaded but doesn't appear | Cached page on Cloudflare | Hard-refresh or wait for CF edge cache to expire (usually < 5 min) |

---

## Local development

```bash
git clone https://github.com/M0TT3P/digihub-mcp.git
cd digihub-mcp
npm install
npm run dev          # tsc in watch mode

# in another shell
export DIGIHUB_BASE_URL=https://digihub.li
export DIGIHUB_API_TOKEN=...
node dist/index.js
```

The server speaks MCP over stdio, so connect it to a real client (Claude Desktop/Code, MCP Inspector) rather than poking it with curl.

---

## License

MIT — see [LICENSE](LICENSE).
