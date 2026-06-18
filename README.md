# digihub-mcp

Model Context Protocol server for the [digihub.li](https://digihub.li) content API.

Drop this into Claude (Desktop, Code, or any other MCP-aware client) and Claude can read and write **Stories**, **Solutions** and **Sessions** on digihub.li, plus upload images that get used as hero or inline media.

---

## What you'll need from the admin

Before you start, ask the digihub.li admin for two values:

- `DIGIHUB_BASE_URL` — e.g. `https://digihub.li`
- `DIGIHUB_API_TOKEN` — looks like `3|abc...` (Sanctum personal access token)

The token encodes what you're allowed to do (read / write / delete per resource type). Treat it like a password.

---

## Install

Until the npm package is published, install from git:

```bash
git clone https://github.com/M0TT3P/digihub-mcp.git
cd digihub-mcp
npm install
npm run build
```

The compiled entry point you point Claude at is `dist/index.js`.

---

## Wire it into your client

### Claude Desktop

Open `claude_desktop_config.json` (on Windows: `%APPDATA%\Claude\`, on macOS: `~/Library/Application Support/Claude/`) and add:

```json
{
  "mcpServers": {
    "digihub": {
      "command": "node",
      "args": ["C:/absolute/path/to/digihub-mcp/dist/index.js"],
      "env": {
        "DIGIHUB_BASE_URL": "https://digihub.li",
        "DIGIHUB_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Restart Claude.

### Claude Code

Use `claude mcp add` or add to `.mcp.json` in your project:

```json
{
  "mcpServers": {
    "digihub": {
      "command": "node",
      "args": ["/absolute/path/to/digihub-mcp/dist/index.js"],
      "env": {
        "DIGIHUB_BASE_URL": "https://digihub.li",
        "DIGIHUB_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### First call

Prompt Claude: *"Use the digihub `whoami` tool."* You should get back your name, email and the list of abilities your token has. If that works, you're set.

---

## Tools

### Stories

| Tool | Purpose |
|---|---|
| `list_stories` | Paginated list. Filters: `status`, `format`, `pillar_id`, `featured`, `per_page` (max 100), `page`. |
| `get_story` | Fetch a single story by slug. |
| `create_story` | Create a new story. |
| `update_story` | PATCH an existing story by slug — only pass fields you want to change. |
| `delete_story` | Soft-delete by slug (only if your token has `stories:delete`). |

**Required on create:** `slug`, `title.de` or `title.en`, `lead.de` or `lead.en`, `format`.

Formats: `news`, `case_study`, `newsletter`, `use_case`, `success_story`.

### Solutions

Same CRUD shape as Stories. Required on create: `slug`, `title`, `summary`. Optional: `body`, `hero_image`, `icon`, `business_areas`, `target_audiences`, `cta_link`, `sort_order`, `tag_slugs`.

### Sessions (events)

Same shape, plus: `format` (free text e.g. `workshop`, `training`, `hackathon`), `starts_at` (ISO datetime, required), `ends_at`, `location`, `capacity`, `register_url`.

Session status: `draft`, `published`, `archived`, `cancelled`.

### Media

`upload_media` — provide either `file` (local file path) or `url` (server fetches it). Optional `subdir`: `uploads`, `stories`, `solutions`, `sessions`. Returns `{ url, extension, size }`. The returned `url` is what you put into `hero_image` or `media[].url` on a subsequent call.

Allowed types: `jpg`, `jpeg`, `png`, `webp`, `avif`, `gif`, `svg`, `pdf`. Max 25 MB.

### Self

`whoami` — returns `{ id, name, email, abilities }`. Useful first call to confirm everything works.

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

### Translations

`title`, `lead`, `summary`, `body` are key-value maps with `de` and/or `en`. At least one of the two must be present on create. `body` accepts Markdown — it's rendered server-side.

---

## End-to-end example

Create a story with an image:

```jsonc
// 1. Upload an image (from a local file path)
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
    "body": { "de": "# Über den Workshop\n\nMarkdown wird gerendert ..." },
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

You can also upload via remote URL — `upload_media` with `{ "url": "https://..." }` makes the server pull it and re-host. Same return shape.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `whoami` returns 401 | Token missing, wrong, or revoked | Ask the admin for a fresh token |
| Tool returns "403" | Your token doesn't have that ability | Ask the admin to issue a token with the missing ability |
| `create_story` returns 422 on `slug` | Slug already used or wrong shape | Slugs are lowercase letters, digits, and dashes only — and must be unique |
| `create_story` returns 422 on `tag_slugs` | Unknown tag slug | Use only existing tags (see Reference data above) |
| Image uploaded but not visible on the site | Browser or CDN cached the old page | Hard-refresh, or wait a couple minutes |

If something else goes wrong, post the tool name + arguments + error message to the admin.

---

## License

MIT — see [LICENSE](LICENSE).
