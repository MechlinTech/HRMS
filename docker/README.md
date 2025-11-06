# HRMS Docker Setup

This directory contains Docker configuration files for the HRMS (Human Resource Management System) application.

## Files Overview

- `Dockerfile` - Production-ready multi-stage build
- `Dockerfile.dev` - Development version with hot reload
- `docker-compose.yml` - Production services configuration
- `docker-compose.dev.yml` - Development services configuration
- `nginx.conf` - Nginx configuration for serving React app
- `env-config.sh` - Runtime environment variable injection
- `.env.example` - Environment variables template

## Quick Start

### Development Environment

1. **Copy environment file:**
   ```bash
   cp docker/.env.example docker/.env
   ```

2. **Edit environment variables:**
   Update `docker/.env` with your actual configuration values.

3. **Start development environment:**
   ```bash
   cd docker
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Access the application:**
   - Frontend: http://localhost:5173
   - Database: localhost:5433

### Production Environment

1. **Build and start production services:**
   ```bash
   cd docker
   docker-compose up -d
   ```

2. **Access the application:**
   - Frontend: http://localhost:3000
   - Database: localhost:5432
   - Redis: localhost:6379

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `VITE_AZURE_CLIENT_ID` | Azure AD application client ID | `12345678-1234-1234-1234-123456789012` |
| `VITE_AZURE_TENANT_ID` | Azure AD tenant ID | `87654321-4321-4321-4321-210987654321` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_AZURE_REDIRECT_URI` | Azure AD redirect URI | `http://localhost:3000` |
| `VITE_API_BASE_URL` | API base URL | `http://localhost:3000/api` |
| `POSTGRES_DB` | PostgreSQL database name | `hrms_db` |
| `POSTGRES_USER` | PostgreSQL username | `hrms_user` |
| `POSTGRES_PASSWORD` | PostgreSQL password | `hrms_password` |

## Services

### Frontend (hrms-frontend)
- **Port:** 3000 (production), 5173 (development)
- **Technology:** React + TypeScript + Vite
- **Web Server:** Nginx (production), Vite dev server (development)

### Database (postgres)
- **Port:** 5432 (production), 5433 (development)
- **Technology:** PostgreSQL 15
- **Includes:** Supabase migrations auto-loaded

### Cache (redis)
- **Port:** 6379
- **Technology:** Redis 7
- **Purpose:** Session storage, caching

## Docker Commands

### Build Images
```bash
# Production build
docker build -f docker/Dockerfile -t hrms-frontend:latest .

# Development build
docker build -f docker/Dockerfile.dev -t hrms-frontend:dev .
```

### Run Services
```bash
# Start all production services
docker-compose -f docker/docker-compose.yml up -d

# Start development services
docker-compose -f docker/docker-compose.dev.yml up -d

# Start specific service
docker-compose up hrms-frontend

# View logs
docker-compose logs -f hrms-frontend
```

### Stop Services
```bash
# Stop all services
docker-compose down

# Stop and remove volumes
docker-compose down -v

# Stop development services
docker-compose -f docker/docker-compose.dev.yml down
```

## Health Checks

All services include health checks:

- **Frontend:** HTTP check on `/health` endpoint
- **PostgreSQL:** `pg_isready` command
- **Redis:** `redis-cli ping` command

Check service health:
```bash
docker-compose ps
```

## Volumes

- `postgres_data` - PostgreSQL data persistence
- `redis_data` - Redis data persistence
- `nginx_logs` - Nginx access and error logs

## Networking

Services communicate through the `hrms-network` bridge network with subnet `172.20.0.0/16`.

## Production Deployment

For production deployment with SSL and domain:

1. **Update nginx-proxy configuration:**
   Create `nginx-proxy.conf` with SSL settings

2. **Add SSL certificates:**
   Place certificates in `./ssl/` directory

3. **Start with production profile:**
   ```bash
   docker-compose --profile production up -d
   ```

## Troubleshooting

### Common Issues

1. **Port conflicts:**
   - Change ports in docker-compose files if needed
   - Check for running services: `netstat -tulpn`

2. **Permission issues:**
   - Ensure Docker daemon is running
   - Check file permissions for mounted volumes

3. **Environment variables not loaded:**
   - Verify `.env` file exists and has correct values
   - Restart containers after environment changes

4. **Database connection issues:**
   - Check PostgreSQL logs: `docker-compose logs postgres`
   - Verify database credentials in environment

### Logs and Debugging

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs hrms-frontend

# Follow logs in real-time
docker-compose logs -f

# Execute commands in running container
docker-compose exec hrms-frontend sh
```

## Development Workflow

1. **Make code changes** in the `src/` directory
2. **Changes auto-reload** in development mode
3. **Test changes** at http://localhost:5173
4. **Build production image** when ready to deploy

## Security Considerations

- Environment variables are injected at runtime
- Nginx includes security headers
- Database uses non-root user
- Health checks prevent unhealthy containers from receiving traffic
- Network isolation between services
