#!/bin/bash

set -e

echo "==> Starting build process"

# Copy theme files to working directory
echo "==> Copying theme files..."
cp -r /theme-src/* /site/ 2>/dev/null || true

# Build webpack assets
echo "==> Installing Node dependencies..."
cd /site
yarn install --frozen-lockfile

echo "==> Building webpack assets..."
yarn build

# Check if build artifacts exist
if [ ! -d "static/assets" ]; then
    echo "ERROR: Build artifacts not found!"
    exit 1
fi
echo "==> Webpack build completed successfully!"

# Set up theme for Hugo
echo "==> Setting up theme..."
mkdir -p /site/usersite/themes
ln -sf /site /site/usersite/themes/hugo-theme-hello-friend

# Build Hugo site
echo "==> Building Hugo site..."
cd /site/usersite

case "$HUGO_ACTION" in
    build)
        hugo build
        ;;
    serve)
        hugo server --bind 0.0.0.0 --baseURL http://127.0.0.1:1313
        ;;
    deploy)
        hugo build
        hugo deploy
        ;;
    *)
        echo "ERROR: Unknown HUGO_ACTION: $HUGO_ACTION"
        echo "Valid options: build, serve, deploy"
        exit 1
        ;;
esac

# Verify build output
if [ "$HUGO_ACTION" = "build" ] || [ "$HUGO_ACTION" = "deploy" ]; then
    if [ ! -d "public" ]; then
        echo "ERROR: Hugo build did not create public directory!"
        exit 1
    fi
    if [ ! -f "public/index.html" ]; then
        echo "ERROR: Hugo did not generate index.html!"
        exit 1
    fi
    echo "==> Hugo build successful - public directory created with content!"
fi

echo "==> Build process completed successfully!"
