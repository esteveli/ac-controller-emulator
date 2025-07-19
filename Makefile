# AC Controller Emulator Makefile

# Variables
COMPOSE_FILE = docker-compose.yml
COMPOSE_DEV_FILE = docker-compose.dev.yml
IMAGE_NAME = ac-controller-emulator
CONTAINER_NAME = ac-controller
CONFIG_CONTAINER = ac-config

# Default target
.PHONY: help
help: ## Show this help message
	@echo "AC Controller Emulator - Available commands:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# Development commands
.PHONY: install
install: ## Install dependencies
	npm install

.PHONY: build
build: ## Build TypeScript project
	npm run build

.PHONY: dev
dev: ## Start development server with hot reload
	npm run dev

.PHONY: start
start: ## Start production server
	npm start

.PHONY: clean
clean: ## Clean build artifacts
	npm run clean

.PHONY: config
config: ## Run configuration CLI (development)
	npm run config:dev

# Docker commands
.PHONY: docker-build
docker-build: ## Build Docker image
	docker build -t $(IMAGE_NAME) .

.PHONY: docker-up
docker-up: ## Start services with Docker Compose
	docker-compose -f $(COMPOSE_FILE) up -d

.PHONY: docker-down
docker-down: ## Stop and remove Docker containers
	docker-compose -f $(COMPOSE_FILE) down

.PHONY: docker-restart
docker-restart: docker-down docker-up ## Restart Docker services

.PHONY: docker-logs
docker-logs: ## View Docker container logs
	docker-compose -f $(COMPOSE_FILE) logs -f

.PHONY: docker-config
docker-config: ## Run configuration CLI in Docker
	docker-compose -f $(COMPOSE_FILE) --profile config run --rm $(CONFIG_CONTAINER)

.PHONY: docker-shell
docker-shell: ## Open shell in running container
	docker exec -it $(CONTAINER_NAME) sh

# Development Docker commands
.PHONY: docker-dev-up
docker-dev-up: ## Start development environment with Docker
	docker-compose -f $(COMPOSE_DEV_FILE) up -d

.PHONY: docker-dev-down
docker-dev-down: ## Stop development Docker environment
	docker-compose -f $(COMPOSE_DEV_FILE) down

.PHONY: docker-dev-config
docker-dev-config: ## Run configuration CLI in development Docker
	docker-compose -f $(COMPOSE_DEV_FILE) --profile config run --rm ac-config-dev

.PHONY: docker-dev-logs
docker-dev-logs: ## View development Docker logs
	docker-compose -f $(COMPOSE_DEV_FILE) logs -f

# Utility commands
.PHONY: mqtt-broker
mqtt-broker: ## Start standalone MQTT broker for development
	docker run --rm -it -p 1883:1883 -p 9001:9001 eclipse-mosquitto:2.0

.PHONY: status
status: ## Show service status
	@echo "=== Docker Containers ==="
	@docker ps --filter "name=$(CONTAINER_NAME)" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "=== MQTT Broker ==="
	@docker ps --filter "name=mosquitto" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

.PHONY: cleanup
cleanup: ## Remove all containers, images, and volumes
	docker-compose -f $(COMPOSE_FILE) down -v --remove-orphans
	docker-compose -f $(COMPOSE_DEV_FILE) down -v --remove-orphans
	docker rmi $(IMAGE_NAME) 2>/dev/null || true
	docker system prune -f

# Quick start commands
.PHONY: quick-start
quick-start: docker-up ## Quick start: build and start service
	@echo ""
	@echo "✅ AC Controller Emulator is now running!"
	@echo "📋 Default configuration created automatically on first run"
	@echo "🔧 To configure devices: make docker-config"
	@echo "📊 Check logs with: make docker-logs"
	@echo "🛑 To stop: make docker-down"

.PHONY: dev-start
dev-start: install dev ## Quick development start: install deps and start dev server

# Testing and linting (if available)
.PHONY: test
test: ## Run tests (if configured)
	npm test

.PHONY: lint
lint: ## Run linter (if configured)
	@if grep -q "lint" package.json; then npm run lint; else echo "No lint script found"; fi

.PHONY: typecheck
typecheck: ## Run TypeScript type checking
	@if grep -q "typecheck" package.json; then npm run typecheck; else npx tsc --noEmit; fi

# All-in-one commands
.PHONY: setup
setup: install build ## Setup project (install + build)
	@echo "✅ Project setup complete!"

.PHONY: reset
reset: cleanup install build ## Reset everything and rebuild
	@echo "✅ Project reset complete!"