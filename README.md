# digihub-mcp

Model Context Protocol server for the [digihub.li](https://digihub.li) content API.

Lets Claude (or any MCP-aware client) read and write **Stories**, **Solutions** and **Sessions** on a digihub-website install, and upload images to use as hero or inline media.

## Install

```bash
npx @m0tt3p/digihub-mcp@latest
```

Or globally:

```bash
npm install -g @m0tt3p/digihub-mcp
```

## Configure

The server needs two environment variables:

| Variable | Example | What it is |
|---|---|---|
| `DIGIHUB_BASE_URL` | `https://digihub.li` | Base URL of the Laravel app (no trailing slash needed) |
| `DIGIHUB_API_TOKEN` | `7\|sLp3...` | Sanctum personal access token issued via `php artisan api:token make` |

### Generate a token

On the digihub-website server:

```bash
php artisan api:token make editor@digihub.li \
    --name="claude-mcp" \
    --ability=stories:read --ability=stories:write \
    --ability=solutions:read --ability=solutions:write \
    --ability=sessions:read --ability=sessions:write \
    --ability=media:write
```

The output shows the plain-text token once. Copy it.

To grant all abilities at once: `--ability=*`.

## Claude Desktop / Code config

In your `claude_desktop_config.json` (or whichever client you use):

```json
{
    "mcpServers": {
        "digihub": {
            "command": "npx",
            "args": ["-y", "@m0tt3p/digihub-mcp@latest"],
            "env": {
                "DIGIHUB_BASE_URL": "https://digihub.li",
                "DIGIHUB_API_TOKEN": "PASTE_YOUR_TOKEN_HERE"
            }
        }
    }
}
```

## Tools exposed

| Tool | What it does |
|---|---|
| `whoami` | Confirm the token works and show granted abilities |
| `list_stories`, `get_story`, `create_story`, `update_story`, `delete_story` | CRUD on Stories |
| `list_solutions`, `get_solution`, `create_solution`, `update_solution`, `delete_solution` | CRUD on Solutions |
| `list_sessions`, `get_session`, `create_session`, `update_session`, `delete_session` | CRUD on Sessions (Events) |
| `upload_media` | Upload a local file or have the server fetch a remote URL. Returns a `/storage/...` URL for use as `hero_image` or `media[].url` |

### Shape of a Story create call

```jsonc
{
    "slug": "my-new-story",
    "title": { "de": "Mein Titel", "en": "My Title" },
    "lead": { "de": "Vorspann", "en": "Lead" },
    "body": { "de": "**Markdown** Text…" },
    "format": "news",
    "hero_image": "/storage/uploads/abc123.jpg",
    "featured": false,
    "status": "published",
    "published_at": "2026-06-18T10:00:00Z",
    "tag_slugs": ["digital-transformation", "ai"]
}
```

Translations are key-value maps with `de` and/or `en`. At least one of the two must be present on create.

## Abilities

Abilities follow `{resource}:{operation}` and are checked on every request:

- `stories:read`, `stories:write`, `stories:delete`
- `solutions:read`, `solutions:write`, `solutions:delete`
- `sessions:read`, `sessions:write`, `sessions:delete`
- `media:write`

Issue a token with only the abilities the holder actually needs. The CLI command above gives full editorial access; for a contributor that only pushes news posts, narrow to `stories:read stories:write media:write`.

## Local development

```bash
git clone https://github.com/M0TT3P/digihub-mcp.git
cd digihub-mcp
npm install
npm run dev          # tsc in watch mode
DIGIHUB_BASE_URL=https://digihub.li DIGIHUB_API_TOKEN=... node dist/index.js
```

## License

MIT — see `LICENSE`.
