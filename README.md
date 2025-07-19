# AC Controller Emulator

A Node.js/TypeScript service that emulates air conditioning controllers via MQTT, providing seamless integration with Home Assistant and other home automation systems.

## Overview

The AC Controller Emulator simulates air conditioning units by:
- Responding to MQTT commands for temperature, mode, fan speed, and power control
- Publishing state updates to MQTT topics
- Providing Home Assistant auto-discovery integration
- Managing infrared (IR) code configurations for different AC models
- Maintaining persistent state across restarts

## Features

- **Multi-AC Support**: Manage multiple virtual AC units simultaneously
- **Home Assistant Integration**: Automatic discovery and configuration
- **IR Code Management**: Store and manage infrared codes for different AC models
- **MQTT Communication**: Full MQTT support for command and state publishing
- **Persistent Storage**: Configuration and state persistence
- **Docker Support**: Containerized deployment with Docker Compose
- **Configuration CLI**: Interactive command-line interface for setup

## Architecture

- **MQTT Client**: Handles all MQTT communication
- **AC Controller Service**: Core service managing AC state and commands
- **Command Handlers**: Specialized handlers for different command types (temperature, mode, fan)
- **State Management**: Persistent storage for AC states and configurations
- **Home Assistant Discovery**: Automatic device discovery and configuration

## Prerequisites

- Node.js 18+
- MQTT Broker (Eclipse Mosquitto recommended)
- Docker and Docker Compose (for containerized deployment)

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/esteveli/ac-controller-emulator.git
cd ac-controller-emulator

# Start everything with one command
make quick-start

# Configure your AC devices (optional)
make docker-config
```

### Option 2: Using Pre-built Docker Image

```bash
# Pull and run the latest image
docker run -d \
  --name ac-controller \
  -v ./data:/app/data \
  -p 3000:3000 \
  ghcr.io/esteveli/ac-controller-emulator:latest

# Configure devices
docker exec -it ac-controller npm run config
```

### Option 3: Local Development

```bash
# Setup and start development server
make dev-start

# Or step by step:
make install     # Install dependencies
make dev         # Start development server

# Configure devices
make config
```

## Configuration

The service uses an interactive CLI for configuration. Run the configuration command to:

- Add new AC units
- Configure MQTT broker settings
- Set up IR codes for different AC models
- Define friendly names and room assignments

Configuration files are stored in the `data/` directory.

## MQTT Topics

### Command Topics
- `ac_controller/{ac_id}/temperature/set` - Set temperature
- `ac_controller/{ac_id}/mode/set` - Set mode (off, cool, heat, dry, fan_only, auto)
- `ac_controller/{ac_id}/fan_mode/set` - Set fan speed (auto, low, medium, high)
- `ac_controller/{ac_id}/power/set` - Set power state (ON/OFF)

### State Topics
- `ac_controller/{ac_id}/temperature/state` - Current temperature setting
- `ac_controller/{ac_id}/mode/state` - Current mode
- `ac_controller/{ac_id}/fan_mode/state` - Current fan speed
- `ac_controller/{ac_id}/power/state` - Current power state

## Home Assistant Integration

The service automatically publishes Home Assistant discovery configurations. Once running, your AC units will appear in Home Assistant as climate entities with full control capabilities.

## Available Commands

Use `make help` to see all available commands. Key commands:

### Quick Commands
- `make quick-start` - Build and start everything with Docker
- `make dev-start` - Setup and start local development
- `make status` - Show service status
- `make cleanup` - Remove all containers and images

### Development
- `make install` - Install dependencies
- `make build` - Build TypeScript project
- `make dev` - Start development server with hot reload
- `make config` - Run configuration CLI (local)
- `make test` - Run tests
- `make typecheck` - Run TypeScript type checking

### Docker Operations
- `make docker-build` - Build Docker image
- `make docker-up` - Start services with Docker Compose
- `make docker-down` - Stop Docker services
- `make docker-config` - Run configuration CLI in Docker
- `make docker-logs` - View Docker container logs
- `make docker-shell` - Open shell in running container

### Utilities
- `make mqtt-broker` - Start standalone MQTT broker for development

## Project Structure

```
src/
├── cli/                    # Configuration CLI
├── mqtt/                   # MQTT client implementation
├── services/               # Core business logic
│   ├── handlers/          # Command handlers
├── storage/               # Data persistence layer
│   ├── search/           # IR code search functionality
└── types/                # TypeScript type definitions
```

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `MQTT_HOST` - MQTT broker host (default: localhost)
- `MQTT_PORT` - MQTT broker port (default: 1883)
- `MQTT_USERNAME` - MQTT username (optional)
- `MQTT_PASSWORD` - MQTT password (optional)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

ISC License - see LICENSE file for details

## Support

For issues and questions, please use the [GitHub Issues](https://github.com/esteveli/ac-controller-emulator/issues) page.