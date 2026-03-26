# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See `AGENTS.md` for full architecture details, patterns, and anti-patterns.

## Commands

```bash
# Build (webpack + Hugo via Docker)
make build

# Development server at http://localhost:1313
make preview

# Fast build validation (~30s)
make test-build

# Full test suite (build + E2E)
make test

# Clean artifacts (keep image cache)
make clean

# Clean image processing cache
make clean-cache

# Manual asset build without Docker
npm run dev    # Watch mode
npm run build  # Production build
```

Override the site directory with `CONTENT_DIR`:
```bash
make build CONTENT_DIR=/path/to/mysite
make preview CONTENT_DIR=/path/to/mysite
```

Deploy to GCS:
```bash
make deploy GCS_BUCKET=gcs:bucket-name
```

## Architecture

**Build pipeline:** Webpack compiles `assets/` → `static/assets/` (JS, CSS, fonts), then Hugo builds `exampleSite/` → `exampleSite/public/`. Docker orchestrates both via `build.sh`.

**Content types:**
- **Posts** — `content/post/`, standard blog posts
- **Gallery** — page bundles: images + `index.md` in `content/gallery/{name}/`
- **Collection** — groups galleries for navigation

**Gallery system:** Images live alongside `index.md` in page bundles. `layouts/partials/gallery-list.html` renders thumbnail grids (accepts `parentUrl`, `sortBy`, `hideUnbrowseable` params). Image processing chain: `get_img.html` (partialCached wrapper) → `get_img_inner.html` (resize to 375px height) → `get_rotation.html` (EXIF rotation).

**Image cache** is stored in `exampleSite/resources/_gen/images/` and persisted across Docker builds. Cold build: 3–5 min for 1,000 images; warm build: 5–10s. Run `make clean-cache` when images change but filenames don't.

**JS libraries** (bundled via webpack): PrismJS, clipboard.js, lightGallery, justifiedGallery. Gallery pages also load jQuery, lightgallery, and lg-* plugins from `static/vendor/`.

## Key Config

```toml
[params]
  UseRelativeCover = true   # REQUIRED for page bundle cover images
  contentTypeName = "post"
  defaultTheme = "dark"
  showMenuItems = 3
  showReadingTime = false

[pagination]
  pagerSize = 5             # Use this, not deprecated `paginate`

[caches.images]
  dir = ":resourceDir/_gen"
  maxAge = -1               # Keep cache indefinitely
```

## Testing

Pre-push: Husky runs `npm run build` automatically.

CI (`.github/workflows/test.yml`) runs webpack build + Hugo build and verifies output files exist.

`make test-build` checks that `static/assets/style.css` exists and validates all critical HTML files in `exampleSite/public/`.
