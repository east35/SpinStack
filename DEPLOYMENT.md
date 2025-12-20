# SpinStack - Synology Deployment Guide

This guide will help you deploy SpinStack on your Synology NAS using Container Manager.

## Prerequisites

- Synology NAS with DSM 7.0 or later
- Container Manager package installed
- SSH access to your Synology NAS (optional, for CLI deployment)
- Discogs API credentials ([get them here](https://www.discogs.com/settings/developers))

## Quick Start

### 1. Prepare Your Synology

1. Open **Package Center** on your Synology
2. Install **Container Manager** if not already installed
3. Create a shared folder for the project (e.g., `/docker/SpinStack`)

### 2. Upload Project Files

Upload the entire SpinStack project to your Synology shared folder using:
- **File Station** (drag and drop)
- **SMB/CIFS** file sharing
- **Git** (if you have Git Server package installed)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:
   ```env
   DISCOGS_CONSUMER_KEY=your_actual_key
   DISCOGS_CONSUMER_SECRET=your_actual_secret
   SESSION_SECRET=$(openssl rand -base64 32)
   FRONTEND_URL=http://YOUR_SYNOLOGY_IP:3200
   NEXT_PUBLIC_API_URL=http://YOUR_SYNOLOGY_IP:3001
   ```

3. **Important:** Update `YOUR_SYNOLOGY_IP` with your actual Synology IP address (e.g., `192.168.1.100`)

### 4. Update Discogs OAuth Callback

1. Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
2. Edit your application
3. Update the **Callback URL** to: `http://YOUR_SYNOLOGY_IP:3200/auth/callback`

## Deployment Options

### Option A: Using Container Manager UI (Recommended for Beginners)

1. Open **Container Manager**
2. Go to **Project** tab
3. Click **Create**
4. Configure:
   - **Project Name:** `spinstack`
   - **Path:** Select your SpinStack folder
   - **Source:** `docker-compose.yml`
5. Click **Next**
6. Review the services (postgres, redis, backend, frontend)
7. Click **Done**

The containers will start automatically!

### Option B: Using SSH (Advanced Users)

1. SSH into your Synology:
   ```bash
   ssh admin@YOUR_SYNOLOGY_IP
   ```

2. Navigate to the project directory:
   ```bash
   cd /volume1/docker/SpinStack
   ```

3. Build and start the containers:
   ```bash
   docker-compose up -d --build
   ```

4. Check status:
   ```bash
   docker-compose ps
   ```

5. View logs:
   ```bash
   docker-compose logs -f
   ```

## Accessing SpinStack

Once deployed, access your app at:
- **Frontend:** `http://YOUR_SYNOLOGY_IP:3200`
- **Backend API:** `http://YOUR_SYNOLOGY_IP:3001`

## First-Time Setup

1. Open `http://YOUR_SYNOLOGY_IP:3200` in your browser
2. Click **"Connect with Discogs"**
3. Authorize the application
4. You'll be redirected back to SpinStack
5. Click **"Sync with Discogs"** to import your collection

## Container Management

### Using Container Manager UI

- **Start/Stop Containers:** Select the project → Click Start/Stop
- **View Logs:** Select a container → Click Details → Logs
- **Restart a Service:** Select a container → Click Restart

### Using CLI

```bash
# Start all services
docker-compose start

# Stop all services
docker-compose stop

# Restart a specific service
docker-compose restart frontend

# View logs
docker-compose logs -f backend

# Remove all containers (keeps data)
docker-compose down

# Remove containers and volumes (⚠️ deletes data)
docker-compose down -v
```

## Port Configuration

If ports 3200 or 3001 are already in use, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "YOUR_PORT:3001"  # Change YOUR_PORT to desired port

  frontend:
    ports:
      - "YOUR_PORT:3000"  # Change YOUR_PORT to desired port (external:internal)
```

Remember to update your `.env` file with the new ports!

## Data Persistence

Your data is stored in Docker volumes:
- **postgres_data:** Database (your collection, users, play history)
- **redis_data:** Session cache

These volumes persist even if containers are stopped or removed (unless you use `docker-compose down -v`).

## Backup

### Using Synology Hyper Backup

1. Include the SpinStack project folder in your backup
2. Include Docker volumes at: `/volume1/@docker/volumes/spinstack_*`

### Manual Database Backup

```bash
# Backup database
docker exec spinstack-db pg_dump -U vinyl_user vinyl_collection > backup_$(date +%Y%m%d).sql

# Restore database
cat backup_20231215.sql | docker exec -i spinstack-db psql -U vinyl_user vinyl_collection
```

## Updating SpinStack

1. Pull latest code (if using Git)
2. Rebuild and restart containers:
   ```bash
   docker-compose up -d --build
   ```

## Troubleshooting

### Containers Won't Start

1. Check logs in Container Manager or:
   ```bash
   docker-compose logs
   ```

2. Verify ports aren't already in use:
   ```bash
   netstat -an | grep 3200
   netstat -an | grep 3001
   ```

### Can't Access the App

1. Verify containers are running:
   ```bash
   docker-compose ps
   ```

2. Check Synology firewall settings (DSM → Control Panel → Security → Firewall)
3. Ensure ports 3200 and 3001 are allowed

### OAuth Callback Error

1. Verify `FRONTEND_URL` in `.env` matches your Synology IP
2. Verify Discogs callback URL matches exactly: `http://YOUR_IP:3200/auth/callback`
3. Ensure cookies are enabled in your browser

### Database Connection Issues

1. Check if postgres container is healthy:
   ```bash
   docker-compose ps postgres
   ```

2. Verify connection string in `.env`

## Performance Tips

1. **Use SSD Storage:** Place Docker volumes on SSD cache (if available)
2. **Resource Allocation:** Give Container Manager at least 2GB RAM
3. **Optimize Images:** Containers are already optimized with multi-stage builds

## Security Recommendations

1. **Change Default Passwords:** Update postgres password in `docker-compose.yml`
2. **Use Strong Session Secret:** Generate with `openssl rand -base64 32`
3. **Enable HTTPS:** Use Synology's reverse proxy with SSL certificate
4. **Firewall:** Limit access to your local network or VPN

## Support

- Report issues: [GitHub Issues](https://github.com/east35/SpinStack/issues)
- Documentation: [README.md](README.md)
