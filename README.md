# digihub-mcp

MCP server for the [digihub.li](https://digihub.li) content API. Plug it into Claude (Desktop or Code) and Claude can read, create, update and delete **Stories**, **Solutions**, **Sessions**, and upload images that get used as hero or inline media.

---

## Requirements

| | What | Where |
|---|---|---|
| 1 | **Node.js 18+** (LTS recommended) | <https://nodejs.org/> — default installer is fine. Provides `node`, `npm`, `npx`. |
| 2 | **An MCP-aware client** | [Claude Desktop](https://claude.ai/download), Claude Code, or any other MCP client. |
| 3 | **A digihub.li API token** | Ask the admin. Looks like `3|abc...`. |
| 4 | **The base URL** | Usually `https://digihub.li`. The admin tells you if different. |

To check Node.js is installed:

```bash
node --version   # should print v18.x or higher
npx --version    # should print 9.x or higher
```

If `npx` isn't found, install Node.js first. **Claude Desktop won't bundle one for you.**

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
| Server doesn't appear in Claude / logs say `spawn npx ENOENT` | Node.js isn't installed or Claude can't find `npx` on PATH. Install Node.js, restart Claude. On macOS with Homebrew, use the absolute path (`/opt/homebrew/bin/npx` on Apple Silicon, `/usr/local/bin/npx` on Intel — `which npx` shows yours). |
| `401` on `whoami` | Token missing or revoked — ask admin for a new one |
| `403` on any tool | Your token doesn't have that ability — ask admin to widen it |
| `422` on `slug` | Slug must be lowercase letters, digits, dashes only; and unique |
| `422` on `tag_slugs` | Unknown tag — only use slugs from Reference data above |
| Image uploaded but doesn't show on the site | Browser/CDN cache; hard-refresh or wait a few minutes |

For anything else, send the admin the tool name, the arguments you used, and the error text.

---

MIT — see [LICENSE](LICENSE).
