You are an experienced, pragmatic software engineering AI agent. Do not over-engineer a solution when a simple one is possible. Keep edits minimal. If you want an exception to ANY rule, you MUST stop and get permission first.

# AGENTS.md

## Project Overview

Hugo theme "Hello Friend" - a minimal, clean theme with photo gallery features for managing large image collections.

**Stack:**
- Hugo Extended 0.74+ (static site generator)
- Webpack (asset bundling)
- PostCSS (CSS processing)
- Docker (build orchestration)
- Playwright (E2E testing)

**Key Features:** Blog posts, photo galleries with lightbox, collections (gallery groups), EXIF metadata display.

## Reference

### Important Files
- `webpack.config.js` - Asset compilation config
- `postcss.config.js` - CSS processing
- `build.sh` - Docker build script
- `docker-compose.yml` - Build/serve orchestration
- `exampleSite/config.toml` - Hugo site config

### Directory Structure
```
assets/          # Source JS/CSS/fonts (webpack input)
static/assets/   # Compiled assets (webpack output)
layouts/         # Hugo templates
  _default/      # Default templates (list, single, baseof)
  gallery/       # Gallery page layouts (list.html, single.html)
  collection/    # Collection layouts (single.html)
  archive/       # Archive page layout
  partials/      # Reusable components
    gallery-list.html   # Gallery thumbnail grid
    get_img.html        # Image processing cache wrapper
    get_img_inner.html  # Image resize (375px height)
    get_rotation.html   # EXIF rotation check
    exif_info.html      # EXIF metadata display
    postcover.html      # Cover image rendering
  shortcodes/    # Hugo shortcodes (image, figure, code, etc.)
exampleSite/     # Test site with content
  resources/     # Hugo image cache (persisted, gitignored)
  public/        # Build output (gitignored)
```

### Architecture

**Build Pipeline:**
1. Webpack compiles `assets/` → `static/assets/` (JS, CSS, fonts)
2. Hugo builds `exampleSite/` → `exampleSite/public/`
3. Docker orchestrates via `build.sh`

**Content Types:**
1. **Posts** (default) - Blog posts in `content/post/`
2. **Gallery** - Page bundles with images alongside `index.md` in `content/gallery/{name}/`
3. **Collection** - Groups of galleries for navigation

**Gallery System:**
- Page bundles: all images (*.jpg) live alongside `index.md`
- Layout: `layouts/gallery/single.html` (lightbox), `layouts/gallery/list.html` (index)
- Collections use `layouts/collection/single.html` with the same `gallery-list.html` partial
- `gallery-list.html` parameters:
  - `parentUrl` - Filters to show only direct children of a URL (compares URL depths)
  - `sortBy` - Sort order ("asc" or "desc")
  - `hideUnbrowseable` - Privacy filter (default true, respects `browseable: false` front matter)

**Image Processing Partials:**
- `get_img.html` - Caches processing by permalink (`partialCached`)
- `get_img_inner.html` - Resizes to 375px height
- `get_rotation.html` - Checks EXIF rotation
- `exif_info.html` - Extracts EXIF metadata for display

### JavaScript Libraries

**Bundled via webpack:**
- PrismJS (syntax highlighting)
- clipboard.js (copy code)
- lightGallery (photo lightbox)
- justifiedGallery (justified grid layout)

**Gallery pages load additionally:**
- `jquery-3.6.1.min.js`
- `lightgallery.min.js`, `jquery.justifiedGallery.js`
- `lg-autoplay.min.js`, `lg-thumbnail.min.js`

### Docker Build

Dockerfile: Debian-based with Hugo Extended 0.142.0, Node.js 18, Yarn.

`build.sh` steps:
1. Copies theme files to `/site/`
2. Installs Node dependencies
3. Builds webpack assets
4. Creates symlink for Hugo theme (exampleSite treats parent dir as theme)
5. Runs Hugo build or serve based on `HUGO_ACTION` env var
6. Verifies outputs exist

### Configuration Parameters

Key `config.toml` params:
```toml
[params]
  contentTypeName = "post"      # Content type for index page
  defaultTheme = "dark"          # "dark" or "light"
  showMenuItems = 3              # Number of menu items (0 = only trigger)
  showReadingTime = false        # Show reading time for posts
  UseRelativeCover = true        # REQUIRED for page bundles
  rssFullText = true             # Include full content in RSS (optional)
```

**Note:** `paginate` is deprecated in Hugo v0.128.0, use `pagination.pagerSize` instead. Main menu doesn't support nesting.

## Essential Commands

`CONTENT_DIR` overrides the site directory (default: `./exampleSite`). Use this to build/preview a real site:
```bash
make build CONTENT_DIR=/path/to/mysite
make preview CONTENT_DIR=/path/to/mysite
```

```bash
# Build site (webpack + Hugo via Docker)
make build

# Development server at http://localhost:1313
make preview

# Run all tests (build + E2E)
make test

# Fast build validation only
make test-build

# Clean build artifacts (keeps image cache)
make clean

# Clean image processing cache
make clean-cache

# Clean everything (artifacts + cache)
make clean-all

# Generate EXIF JSON sidecars
make exif-json

# Validate cache functionality
make test-cache

# Manual asset dev (without Docker)
npm run dev    # Watch mode
npm run build  # Production build
```

## Testing

**`make test-build`** (fast, ~30s):
- Verifies webpack compiled `static/assets/style.css`
- Checks all critical HTML files exist in `exampleSite/public/`
- Validates markdown → HTML conversion for all content types
- Files checked: home page, blog posts, gallery pages, archive page

**`make test`** (full):
- Runs `test-build` first for fast feedback
- Runs Playwright E2E tests

**CI** (`.github/workflows/test.yml`):
- Builds webpack assets, verifies `static/assets/` exists
- Runs Hugo build, verifies `public/index.html` exists

## Patterns

### Page Bundles (Galleries)
Gallery images must be in the same directory as `index.md`. Always set in config:
```toml
[params]
  UseRelativeCover = true
```
**Why:** `postcover.html` uses relative URLs (permalink + filename) instead of `absURL`, which breaks for page bundle resources.

### Image Processing
- Images resized to 375px height via `get_img.html`
- Cache stored in `exampleSite/resources/_gen/` (10-50x speedup)
- Use `make clean-cache` if images change but filenames don't

### Build Caching

Cache stored in `exampleSite/resources/_gen/images/`, persisted across Docker builds via volume mount.

**Performance:** Cold build: 3-5 min for 1,000 images. Warm build: 5-10 seconds (10-50x speedup).

**Cache config** in `exampleSite/config.toml`:
```toml
[caches.images]
  dir = ":resourceDir/_gen"
  maxAge = -1  # Keep indefinitely
```

**Volume mount** in `docker-compose.yml`:
```yaml
volumes:
  - ./exampleSite/resources:/site/exampleSite/resources
```

**Clear cache when:** images modified with same filename, changing processing params, debugging image issues.

**Troubleshooting:**
- Cache not persisting → check docker-compose.yml volume mount, .gitignore
- Images not reprocessing → `make clean-cache`, check modification times
- Builds still slow → check `du -sh exampleSite/resources`, verify Docker volume mounted

## Anti-Patterns

- **Don't bypass Docker for builds** - Always use `make build` or `make preview` for consistency
- **Don't use `absURL` for page bundle resources** - Use relative URLs with `UseRelativeCover = true`
- **Don't commit `node_modules/`, `public/`, or `resources/`** - All gitignored

## Commit and Pull Request Guidelines

### Before Committing
1. Run `make test-build` (fast validation)
2. Run `make test` for full E2E suite
3. Husky pre-push hook runs `npm run build` automatically

### Commit Messages
Use conventional format: `type: description`

Examples from history:
- `Fix XSS vulnerability in justifiedGallery`
- `Optimize rclone deploy and clarify build target documentation`
- `Add waterfalls gallery with portrait cover image for layout testing`

### PR Requirements
- All CI checks must pass (GitHub Actions runs build + Hugo verification)
- Include description of changes and testing performed
