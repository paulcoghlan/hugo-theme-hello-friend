# Docker Build for Hugo Theme

This directory contains a Dockerized build system for the Hugo theme that handles both webpack asset compilation and Hugo site generation.

## Prerequisites

- Docker installed and running (OrbStack or Docker Desktop)
  - **Note**: Make sure OrbStack is running before executing commands
- Docker Compose (optional, for easier commands)

## Quick Start

### Build the Hugo site

```bash
docker-compose up hugo-build
```

This will:
1. Install Node.js dependencies
2. Build webpack assets
3. Build the Hugo site
4. Output the result to `exampleSite/public/`

### Serve the site locally

```bash
docker-compose up hugo-serve
```

This will serve the site at http://localhost:1313

### Using Docker directly

Build and run:
```bash
# Build the image
docker build -t hugo-theme-test .

# Run build
docker run --rm -v $(pwd)/exampleSite/public:/site/exampleSite/public hugo-theme-test

# Run server
docker run --rm -p 1313:1313 -e HUGO_ACTION=serve hugo-theme-test
```

## Files

- `Dockerfile` - Multi-stage Docker build based on Debian with Hugo Extended and Node.js
- `build.sh` - Build script that handles webpack and Hugo builds
- `docker-compose.yml` - Compose file for easy build and serve commands
- `.dockerignore` - Excludes unnecessary files from Docker build context

## Build Arguments

The `HUGO_ACTION` environment variable controls the build behavior:
- `build` (default) - Builds the static site
- `serve` - Runs the Hugo development server

## Verification

The build script automatically verifies:
- Webpack assets are created in `static/assets/`
- Hugo generates the `public/` directory
- `index.html` is created

If any verification fails, the build will exit with an error.
