# digihub-mcp

MCP server for the [digihub.li](https://digihub.li) content API. Plug it into Claude (Desktop or Code) and Claude can read, create, update and delete **Stories**, **Solutions**, **Sessions**, and upload images that get used as hero or inline media.

---

## You'll need from the admin

- `DIGIHUB_BASE_URL` — usually `https://digihub.li`
- `DIGIHUB_API_TOKEN` — looks like `3|abc...`. Treat it like a password.

Your abilities (read / write / delete per resource type) are baked into the token. Ask the admin for more if you hit a `403`.

---

## Configure your Claude client

Same JSON for Desktop and Code — only the file path differs:

- **Desktop**: `claude_desktop_config.json` (Windows: `%APPDATA%\Claude\`, macOS: `~/Library/Application Support/Claude/`)
- **Code**: `.mcp.json` in your project, or `claude mcp add`

```json
{
  "mcpServers": {
    "digihub": {
      "command": "npx",
      "args": ["-y", "@stefan443/digihub-mcp@latest"],
      "env": {
        "DIGIHUB_BASE_URL": "https://digihub.li",
        "DIGIHUB_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

Restart the client. First prompt: *"Use the digihub whoami tool."* You should see your name, email, and the abilities list.

---

## Tools

| Resource | Tools |
|---|---|
| Stories | `list_stories`, `get_story`, `create_story`, `update_story`, `delete_story` |
| Solutions | `list_solutions`, `get_solution`, `create_solution`, `update_solution`, `delete_solution` |
| Sessions (events) | `list_sessions`, `get_session`, `create_session`, `update_session`, `delete_session` |
| Media | `upload_media` — pass `file` (local path) **or** `url` (server fetches it). Returns a `/storage/...` URL you put into `hero_image` or `media[].url`. |
| Self | `whoami` |

**Required fields on create:**

- Story: `slug`, `title.de`/`title.en`, `lead.de`/`lead.en`, `format` (`news`, `case_study`, `newsletter`, `use_case`, `success_story`)
- Solution: `slug`, `title`, `summary`
- Session: `slug`, `title`, `summary`, `format` (free text), `starts_at` (ISO date)

**Translations** (`title`, `lead`, `summary`, `body`) are objects with `de` and/or `en`. At least one must be present. `body` accepts Markdown.

**Filters on list_***: `status`, `format`, `pillar_id`, `featured`, `per_page` (≤ 100), `page`. `list_sessions` also takes `upcoming: true`.

---

## Reference data

| Pillar | id | key |
|---|---|---|
| AI Lab | 1 | `lab` |
| Coworking Hub | 2 | `hub` |
| Förderprogramme | 3 | `fund` |

Tag slugs by type (pass `tag_slugs: ["ai", "kmu"]`):

- **business_area**: `lab`, `hub`, `fund`
- **audience**: `kmu`, `verwaltung`, `startup`, `finanzdienstleister`, `industrie`
- **topic**: `ai`, `datenschutz`, …

The API only accepts existing tag slugs.

---

## Example: a story with an image

```jsonc
// 1. Upload an image from a local path
{ "tool": "upload_media", "args": { "file": "C:/Pictures/hero.jpg", "subdir": "stories" } }
// → { "url": "/storage/stories/abc123.jpg" }

// 2. Create the story referencing it
{
  "tool": "create_story",
  "args": {
    "slug": "ki-workshop-im-mai",
    "pillar_id": 1,
    "title": { "de": "KI-Workshop im Mai", "en": "AI Workshop in May" },
    "lead": { "de": "Drei Stunden Hands-on mit echten KMU-Use-Cases." },
    "body": { "de": "# Worum geht's\n\nMarkdown wird gerendert ..." },
    "format": "news",
    "hero_image": "/storage/stories/abc123.jpg",
    "author_name": "digihub.li Team",
    "tag_slugs": ["ai", "kmu"],
    "status": "published",
    "published_at": "2026-05-01T08:00:00Z"
  }
}
```

`upload_media` also accepts `{ "url": "https://..." }` — the server fetches the remote URL and re-hosts the file.

---

## When something doesn't work

| Error | What's wrong |
|---|---|
| `401` on `whoami` | Token missing or revoked — ask admin for a new one |
| `403` on any tool | Your token doesn't have that ability — ask admin to widen it |
| `422` on `slug` | Slug must be lowercase letters, digits, dashes only; and unique |
| `422` on `tag_slugs` | Unknown tag — only use slugs from Reference data above |
| Image uploaded but doesn't show on the site | Browser/CDN cache; hard-refresh or wait a few minutes |

For anything else, send the admin the tool name, the arguments you used, and the error text.

---

MIT — see [LICENSE](LICENSE).
