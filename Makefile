.PHONY: build serve clean test

# Build the Hugo site using Docker
build:
	docker-compose up hugo-build

# Serve the site locally
serve:
	docker-compose up hugo-serve

# Run tests (same as build, verifies artifacts)
test: build

# Clean build artifacts and Docker images
clean:
	rm -rf exampleSite/public exampleSite/resources node_modules
	docker-compose down --rmi local --remove-orphans 2>/dev/null || true

# Build Docker image
docker-build:
	docker build -t hugo-theme-test .

# Help
help:
	@echo "Available targets:"
	@echo "  build        - Build the Hugo site (runs webpack + hugo build)"
	@echo "  serve        - Serve the site at http://localhost:1313"
	@echo "  test         - Run tests (builds and verifies artifacts)"
	@echo "  clean        - Remove build artifacts and Docker images"
	@echo "  docker-build - Build the Docker image"
	@echo "  help         - Show this help message"
