# Obsidian Supabase RAG Sync

Bidirectional sync between your Obsidian vault and an [OB1](https://github.com/NateBJones-Projects/OB1) Supabase RAG database.

## What it does

| Direction | Trigger | What happens |
|-----------|---------|--------------|
| Vault → Supabase | File save | Hashes content, re-embeds if changed, upserts the `thoughts` row |
| Vault → Supabase | Background loop | Scans sync folder, pushes any changed files |
| Supabase → Vault | Background loop | Writes `pending` thoughts as `.md` files in the output folder |
| Conflict | Background loop | If both sides changed, sets `status=conflict` and shows a Notice |

## Prerequisites

1. An [OB1](https://github.com/NateBJones-Projects/OB1) Supabase project with the `thoughts` table (columns: `id`, `content`, `embedding`, `metadata`, `obsidian_path`, `obsidian_sync_status`, `obsidian_synced_at`, `obsidian_file_hash`).
2. A Supabase project URL and anon key.
3. An OpenAI API key (model: `text-embedding-3-small`).

## Installation

### From source

```bash
cd obsidian-plugin
npm install
npm run build
```

Copy `main.js` and `manifest.json` into your vault's `.obsidian/plugins/obsidian-supabase-sync/` folder, then enable the plugin in Obsidian → Settings → Community plugins.

### Development (watch mode)

```bash
npm run dev
```

## Configuration

Open **Settings → Supabase RAG Sync** and fill in:

| Field | Description |
|-------|-------------|
| Supabase URL | `https://<project>.supabase.co` |
| Supabase anon key | Public anon key from Supabase project settings |
| OpenAI API key | `sk-…` — used only for generating embeddings |
| Vault folder to sync | Vault-relative path (e.g. `Notes`). Leave blank for entire vault. |
| Output folder for MCP thoughts | Where `pending` thoughts land as `.md` files (default: `OB1 Thoughts`) |
| Sync interval | Minutes between background syncs (1–60, default 5) |

## Frontmatter

The plugin injects a `supabase_id` field into note frontmatter on first sync so the link survives file renames:

```yaml
---
supabase_id: 3f5a8c2d-…
---

Your note content here.
```

## Sync status values

| Value | Meaning |
|-------|---------|
| `pending` | Created via MCP/API, not yet written to vault |
| `synced` | In sync on both sides |
| `obsidian_origin` | Created in Obsidian, not via MCP |
| `modified` | Changed in Supabase since last vault sync |
| `conflict` | Both vault and Supabase changed — resolve manually |

## Conflict resolution

When a conflict is detected the plugin:
1. Sets `obsidian_sync_status = 'conflict'` in Supabase.
2. Shows an Obsidian Notice naming the file.

To resolve: decide which version wins, edit the file, and save — the next save will re-sync with the new content and clear the conflict status.

## Security

API keys are stored in your vault's `.obsidian/plugins/obsidian-supabase-sync/data.json`. Ensure your `.gitignore` excludes `.obsidian/` if you version-control your vault.
