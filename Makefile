.PHONY: build preview deploy clean clean-cache clean-all test test-build test-cache playwright-install test-e2e exif-json

# Content directory (override with: make build CONTENT_DIR=/path/to/site)
CONTENT_DIR ?= ./exampleSite
export CONTENT_DIR

# GCS bucket for deployment (override with: make deploy GCS_BUCKET=gs://your-bucket)
GCS_BUCKET ?= gs://your-bucket-name

# Build the Hugo site using Docker
build:
	docker-compose up hugo-build

# Validate build outputs (fast feedback)
test-build: build
	@echo "Validating build outputs..."
	@test -d $(CONTENT_DIR)/public || (echo "ERROR: public/ directory missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/assets/style.css || (echo "ERROR: webpack CSS missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/index.html || (echo "ERROR: home page missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/about/index.html || (echo "ERROR: about page missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/post/hello/index.html || (echo "ERROR: blog post missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/gallery/index.html || (echo "ERROR: gallery list missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/gallery/nature/index.html || (echo "ERROR: gallery/nature missing" && exit 1)
	@test -f $(CONTENT_DIR)/public/gallery/nature/landscapes/index.html || (echo "ERROR: gallery/nature/landscapes missing (1-level nested)" && exit 1)
	@test -f $(CONTENT_DIR)/public/gallery/nature/landscapes/mountains/index.html || (echo "ERROR: gallery/nature/landscapes/mountains missing (2-level nested)" && exit 1)
	@test -f $(CONTENT_DIR)/public/archive/index.html || (echo "ERROR: archive page missing" && exit 1)
	@echo "✓ All critical HTML files generated successfully (including nested galleries)"

# Preview the site locally
preview:
	docker-compose up hugo-serve

# Deploy to GCS bucket using rclone
deploy: build
	@echo "Deploying $(CONTENT_DIR)/public to $(GCS_BUCKET)..."
	rclone sync $(CONTENT_DIR)/public $(GCS_BUCKET) --progress
	@echo "✓ Deployment complete"

# Generate EXIF JSON sidecar files for all images
exif-json:
	docker-compose run --rm exif-json

# Install Playwright browsers
playwright-install:
	npx playwright install --with-deps

# Run Playwright E2E tests
test-e2e:
	npx playwright test

# Run all tests (build validation + E2E tests)
test: test-build playwright-install test-e2e

# Test cache functionality
test-cache:
	@echo "Testing cache validation..."
	npx playwright test tests/cache-validation.spec.js

# Clean build artifacts only (KEEPS cache)
clean:
	rm -rf $(CONTENT_DIR)/public
	docker-compose down --rmi local --remove-orphans 2>/dev/null || true

# Clean cache only (force reprocessing all images)
clean-cache:
	@echo "Removing Hugo resources cache..."
	rm -rf $(CONTENT_DIR)/resources
	@echo "✓ Cache cleared. Next build will regenerate all images."

# Deep clean (removes everything)
clean-all: clean clean-cache
	@echo "✓ Complete cleanup finished"

# Build Docker image
docker-build:
	docker build -t hugo-theme-test .

# Help
help:
	@echo "Available targets:"
	@echo "  build              - Build the Hugo site (runs webpack + hugo build)"
	@echo "  preview            - Preview the site at http://localhost:1313"
	@echo "  deploy             - Deploy to GCS bucket (set GCS_BUCKET=gs://your-bucket)"
	@echo "  exif-json          - Generate EXIF JSON sidecar files for all images"
	@echo "  test               - Run all tests (build validation + E2E tests)"
	@echo "  test-build         - Fast build validation (checks HTML files exist)"
	@echo "  test-cache         - Test cache validation"
	@echo "  test-e2e           - Run Playwright E2E tests"
	@echo "  playwright-install - Install Playwright browsers"
	@echo "  clean              - Remove build artifacts (keeps cache)"
	@echo "  clean-cache        - Remove image processing cache"
	@echo "  clean-all          - Remove build artifacts AND cache"
	@echo "  docker-build       - Build the Docker image"
	@echo "  help               - Show this help message"
	@echo ""
	@echo "Variables:"
	@echo "  CONTENT_DIR        - Site directory (default: ./exampleSite)"
	@echo "  GCS_BUCKET         - GCS bucket for deploy (default: gs://your-bucket-name)"
	@echo ""
	@echo "Examples:"
	@echo "  make preview CONTENT_DIR=/path/to/mysite"
	@echo "  make deploy CONTENT_DIR=/path/to/mysite GCS_BUCKET=gs://my-bucket"

