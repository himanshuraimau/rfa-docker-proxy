# Reverse Proxy Project

This project sets up a reverse proxy using Node.js, Express, and Docker. The reverse proxy routes incoming requests based on the subdomain to the appropriate Docker container. Additionally, it includes a management API for handling Docker container operations.

## Features

- **Reverse Proxy**: Routes requests to Docker containers based on subdomain.
- **Management API**: Allows pulling and managing Docker images and containers.
- **Event Listening**: Automatically registers newly started containers.

## Requirements

- Node.js (>= 14.x)
- Docker
- Docker Compose

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd reverse-proxy
```

### 2. Start the Services

Use Docker Compose to start the services:

```bash
docker compose up
```

This command will start both the reverse proxy and management API. The management API will be accessible at `http://localhost:8080`, and the reverse proxy will run at `http://localhost`.

### 4. Pull and Start Containers

You can pull and start a Docker container by making a POST request to the management API:

**Endpoint**: `POST http://localhost:8080/containers`

**Request Body**:

```json
{
  "image": "your-docker-image",
  "tags": "latest"
}
```

### 5. Accessing Containers

Once a container is running, you can access it using the subdomain format: `http://<container-name>.localhost`.

## Technologies Used

- Node.js
- Express
- Dockerode (for Docker interactions)
- http-proxy (for reverse proxy functionality)



