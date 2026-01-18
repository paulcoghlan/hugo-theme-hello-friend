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
  gallery/       # Gallery page layouts
  collection/    # Collection layouts
  partials/      # Reusable components (gallery-list.html, get_img.html)
exampleSite/     # Test site with content
  resources/     # Hugo image cache (persisted, gitignored)
  public/        # Build output (gitignored)
```

### Architecture
1. Webpack compiles `assets/` → `static/assets/`
2. Hugo builds `exampleSite/` → `exampleSite/public/`
3. Docker orchestrates via `build.sh`

**Gallery System:** Page bundles with images alongside `index.md`. Uses `partials/gallery-list.html` for thumbnail grids.

## Essential Commands

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

# Generate EXIF JSON sidecars
make exif-json

# Manual asset dev (without Docker)
npm run dev    # Watch mode
npm run build  # Production build
```

## Patterns

### Page Bundles (Galleries)
Gallery images must be in the same directory as `index.md`. Always set in config:
```toml
[params]
  UseRelativeCover = true
```

### Image Processing
- Images resized to 375px height via `get_img.html`
- Cache stored in `exampleSite/resources/_gen/` (10-50x speedup)
- Use `make clean-cache` if images change but filenames don't

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
