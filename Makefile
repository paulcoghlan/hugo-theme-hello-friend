.PHONY: build serve clean test test-build

# Build the Hugo site using Docker
build:
	docker-compose up hugo-build

# Validate build outputs (fast feedback)
test-build: build
	@echo "Validating build outputs..."
	@test -d exampleSite/public || (echo "ERROR: public/ directory missing" && exit 1)
	@test -f exampleSite/public/assets/style.css || (echo "ERROR: webpack CSS missing" && exit 1)
	@test -f exampleSite/public/index.html || (echo "ERROR: home page missing" && exit 1)
	@test -f exampleSite/public/about/index.html || (echo "ERROR: about page missing" && exit 1)
	@test -f exampleSite/public/post/hello/index.html || (echo "ERROR: blog post missing" && exit 1)
	@test -f exampleSite/public/gallery/index.html || (echo "ERROR: gallery list missing" && exit 1)
	@test -f exampleSite/public/gallery/nature/index.html || (echo "ERROR: gallery/nature missing" && exit 1)
	@test -f exampleSite/public/gallery/nature/landscapes/index.html || (echo "ERROR: gallery/nature/landscapes missing (1-level nested)" && exit 1)
	@test -f exampleSite/public/gallery/nature/landscapes/mountains/index.html || (echo "ERROR: gallery/nature/landscapes/mountains missing (2-level nested)" && exit 1)
	@test -f exampleSite/public/archive/index.html || (echo "ERROR: archive page missing" && exit 1)
	@echo "✓ All critical HTML files generated successfully (including nested galleries)"

# Serve the site locally
serve:
	docker-compose up hugo-serve

# Run tests (validates build outputs)
test: test-build

# Clean build artifacts and Docker images
clean:
	rm -rf exampleSite/public exampleSite/resources
	docker-compose down --rmi local --remove-orphans 2>/dev/null || true

# Build Docker image
docker-build:
	docker build -t hugo-theme-test .

# Help
help:
	@echo "Available targets:"
	@echo "  build        - Build the Hugo site (runs webpack + hugo build)"
	@echo "  serve        - Serve the site at http://localhost:1313"
	@echo "  test         - Run tests (validates build outputs)"
	@echo "  test-build   - Fast build validation (checks HTML files exist)"
	@echo "  clean        - Remove build artifacts and Docker images"
	@echo "  docker-build - Build the Docker image"
	@echo "  help         - Show this help message"

