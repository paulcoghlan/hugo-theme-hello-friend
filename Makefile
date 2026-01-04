.PHONY: build serve clean test test-build playwright-install test-e2e

# Build the Hugo site using Docker
build:
	docker-compose up hugo-build

# Serve the site locally
serve:
	docker-compose up hugo-serve

# Run build tests (verifies artifacts)
test-build: build

# Install playwright browsers
playwright-install:
	npx playwright install --with-deps

# Run e2e tests
test-e2e:
	npx playwright test

# Run all tests
test: playwright-install test-e2e

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
	@echo "  build              - Build the Hugo site (runs webpack + hugo build)"
	@echo "  serve              - Serve the site at http://localhost:1313"
	@echo "  test               - Run all tests"
	@echo "  test-build         - Run build tests (verifies artifacts)"
	@echo "  playwright-install - Install Playwright browsers"
	@echo "  test-e2e           - Run e2e tests"
	@echo "  clean              - Remove build artifacts and Docker images"
	@echo "  docker-build       - Build the Docker image"
	@echo "  help               - Show this help message"
