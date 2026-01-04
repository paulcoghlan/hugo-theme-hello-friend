# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Hugo theme called "Hello Friend" - a minimal, clean theme for Hugo static sites. This fork includes photo gallery features for managing large collections of images.

**Minimum Hugo Version:** 0.74.x (requires Hugo Extended for SCSS processing)

## Build System

The project uses a Docker-based build system with webpack for asset compilation. All builds must go through Docker to ensure consistent environments.

### Common Commands

```bash
# Clean all build artifacts and Docker images
make clean

# Build the site (webpack + Hugo build)
make build

# Serve the site at http://localhost:1313
make serve

# Fast build validation (checks HTML files exist)
make test-build

# Run full test suite (build validation + E2E tests)
make test
```

### Manual Development (without Docker)

If you need to work on theme assets directly:

```bash
# Install dependencies
yarn install

# Watch mode for development
yarn dev

# Production build
yarn build
```

**Important:** After modifying theme files, you must rebuild the site with `make build` or restart `make serve` for changes to take effect, as Docker copies files at build time.

## Architecture

### Build Pipeline

1. **Webpack** (webpack.config.js) compiles assets from `assets/` to `static/assets/`:
   - JavaScript: `assets/js/{menu,theme,prism}.js` → `static/assets/{main,prism}.js`
   - CSS: `assets/css/style.css` → `static/assets/style.css` (with PostCSS processing)
   - Fonts: `assets/fonts/*.woff2` → `static/assets/fonts/`

2. **Hugo** builds the site from `exampleSite/` to `exampleSite/public/`

3. **Docker** orchestrates the entire build process via `build.sh`

### Content Types

The theme supports three primary content types:

1. **Posts** (default): Standard blog posts in `content/post/`
2. **Gallery**: Photo galleries with page bundles (images alongside index.md)
3. **Collection**: Groups of galleries for navigation

### Gallery Feature Architecture

This is the most complex part of the theme. Key concepts:

#### Gallery Type
- Located in `content/gallery/{name}/index.md`
- Uses page bundles: all images (*.jpg) live alongside index.md
- Layout: `layouts/gallery/single.html`
- Renders individual gallery with lightbox functionality

#### Collection Type
- Groups multiple galleries for navigation
- Layout: `layouts/collection/single.html`
- Uses same `gallery-list.html` partial as gallery list pages

#### Gallery List Partial
- **File:** `layouts/partials/gallery-list.html`
- **Purpose:** Displays thumbnail grid of galleries
- **Key Parameters:**
  - `parentUrl`: Filters to show only direct children of a URL
  - `sortBy`: Sort order ("asc" or "desc")
  - `hideUnbrowseable`: Privacy filter (default true)
- **Filtering Logic:**
  - Compares URL depths to show only direct children (not nested galleries)
  - Respects `browseable: false` front matter parameter

#### Image Processing
- **Partials:**
  - `get_img.html`: Caches image processing by permalink
  - `get_img_inner.html`: Resizes images to 375px height
  - `get_rotation.html`: Checks EXIF for rotation
  - `exif_info.html`: Extracts EXIF metadata for display

### Cover Image Handling

**Critical Configuration:** For page bundles (galleries), you MUST set:

```toml
[params]
  UseRelativeCover = true
```

This tells `postcover.html` to use relative URLs (concatenating permalink + filename) instead of `absURL`, which breaks for page bundle resources.

## Layout Structure

```
layouts/
├── _default/           # Default templates (list, single, baseof)
├── gallery/            # Gallery-specific layouts
│   ├── list.html      # Gallery index (e.g., /gallery/)
│   └── single.html    # Individual gallery with lightbox
├── collection/         # Collection layouts
│   └── single.html    # Collection page with gallery grid
├── archive/            # Archive page layout
├── partials/           # Reusable components
│   ├── gallery-list.html   # Gallery thumbnail grid
│   ├── get_img*.html       # Image processing
│   ├── postcover.html      # Cover image rendering
│   └── [other partials]
└── shortcodes/         # Hugo shortcodes (image, figure, code, etc.)
```

## Testing

### Local Testing

The Makefile provides two test targets:

- **`make test-build`**: Fast build validation (~30s)
  - Verifies webpack compiled `static/assets/style.css`
  - Checks all critical HTML files exist in `exampleSite/public/`
  - Validates markdown → HTML conversion for all content types
  - Files checked: home page, blog posts, gallery pages, archive page

- **`make test`**: Full test suite
  - Runs `test-build` for fast feedback
  - Runs Playwright E2E tests (if configured)

### CI Testing

GitHub Actions (`.github/workflows/test.yml`) runs:
- Builds webpack assets
- Verifies `static/assets/` exists
- Runs Hugo build
- Verifies `public/index.html` exists

## JavaScript Libraries

The theme includes via webpack:
- **PrismJS**: Syntax highlighting (extensive language support)
- **clipboard.js**: Copy code functionality
- **lightGallery**: Photo gallery lightbox (loaded in gallery pages)
- **justifiedGallery**: Justified grid layout for photos

Gallery pages load additional assets:
- `jquery-3.6.1.min.js`
- `lightgallery.min.js`
- `jquery.justifiedGallery.js`
- `lg-autoplay.min.js`, `lg-thumbnail.min.js`

## Configuration Parameters

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

## Shortcodes

Built-in shortcodes (see README.md for full documentation):
- `image`: Image with positioning
- `figure`: Image with caption
- `imgproc`: Hugo image processing
- `code`: Collapsible code blocks

## Docker Build Details

The Dockerfile creates a Debian-based image with:
- Hugo Extended 0.142.0
- Node.js 18
- Yarn package manager

The `build.sh` script:
1. Copies theme files to `/site/`
2. Installs Node dependencies
3. Builds webpack assets
4. Creates symlink for Hugo theme
5. Runs Hugo build or serve based on `HUGO_ACTION` env var
6. Verifies outputs exist

## Important Notes

- **Theme as submodule:** The exampleSite treats the parent directory as a theme via symlink in Docker
- **Asset rebuilds:** Webpack must run before Hugo to generate assets
- **Page bundles:** Always use `UseRelativeCover = true` when working with galleries
- **Menu structure:** Main menu doesn't support nesting
- **Deprecated config:** `paginate` is deprecated in Hugo v0.128.0, use `pagination.pagerSize` instead

## Development Practises

- Run `make serve`, `make test` or Playwright to verify changes.