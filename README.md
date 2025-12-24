# Vinyl Collection App

A Spotify/Tidal-inspired web app for your physical vinyl collection. Generate playlists (called "stacks"), track listening stats, and rediscover forgotten gems from your Discogs collection.

## Features

- **Discogs Integration**: Sync your entire vinyl collection via Discogs OAuth
- **Smart Stacks**: Generate playlists based on different algorithms:
  - Daily Discovery: Weighted toward least-played records
  - Rare Gems: Never or rarely played records
  - Dust Collectors: Records you haven't played in the longest time
  - Recently Added: Your newest acquisitions
  - Favorites: Most played records
  - Time Machine: Random selection from your collection
  - Genre Stacks: Auto-generated stacks for each genre
- **Stack Player**: Two-phase player experience:
  - Pull Records view: Shows numbered albums to pull from shelf
  - Now Spinning view: Swipe through albums, mark as played/skipped
- **Collection Management**: Search, sort, filter, and like your albums
- **Listening Stats**: Track play counts, listening history, and collection analytics
- **Mobile-First Design**: Clean, Tidal-inspired interface optimized for mobile devices

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Frontend**: Next.js 14, React, Tailwind CSS
- **API Integration**: Discogs OAuth 1.0a
- **Deployment**: Docker with pre-built images available on GitHub Container Registry

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Discogs account with API credentials
- Homebrew (for macOS local development)

### Get Discogs API Credentials

1. Visit [https://www.discogs.com/settings/developers](https://www.discogs.com/settings/developers)
2. Click "Create an App"
3. Fill in the application details:
   - **Application Name**: Vinyl Collection (or your choice)
   - **Application URL**: `http://localhost:3000` (or your server IP for mobile testing)
   - **Callback URL**: `http://localhost:3000/auth/callback`
4. Save the **Consumer Key** and **Consumer Secret**

### Local Development Setup

**One-time setup:**

```bash
# Run the setup script - installs PostgreSQL, Redis, and dependencies
./setup-local.sh
```

This script will:
- Install PostgreSQL 16 and Redis via Homebrew
- Create the database and user
- Install all npm dependencies
- Run database migrations

**Configure environment variables:**

If not already created, copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your Discogs credentials:
```env
DISCOGS_CONSUMER_KEY=your_consumer_key_here
DISCOGS_CONSUMER_SECRET=your_consumer_secret_here
SESSION_SECRET=generate-a-random-string-here
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Generate a secure session secret:
```bash
openssl rand -base64 32
```

**Starting the app:**

```bash
# Start both frontend and backend (accessible from mobile on same network)
./start-local-mobile.sh
```

The script will:
- Detect your local network IP
- Start PostgreSQL and Redis (if not running)
- Launch backend on port 3001
- Launch frontend on port 3000
- Display URLs for both desktop and mobile access

Access the app:
- **Desktop**: [http://localhost:3000](http://localhost:3000)
- **Mobile** (same WiFi): `http://YOUR_LOCAL_IP:3000`

Press `Ctrl+C` to stop all services.

**Managing local services:**

```bash
# Stop PostgreSQL and Redis
brew services stop postgresql@16 redis

# Start PostgreSQL and Redis
brew services start postgresql@16 redis

# Check service status
brew services list

# View PostgreSQL logs
tail -f /opt/homebrew/var/log/postgresql@16.log
```

## Deployment on Synology NAS

Perfect for running on Synology Container Manager or any Docker environment.

### Prerequisites

- Synology NAS with DSM 7.0 or later
- Container Manager package installed
- SSH access (optional, for CLI deployment)
- Discogs API credentials

### Setup

1. **Prepare Your Synology**
   - Open Package Center and install Container Manager
   - Create a shared folder (e.g., `/docker/VinylApp`)

2. **Upload Project Files**
   - Use File Station, SMB/CIFS, or Git to upload the project

3. **Configure Environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your settings:
   ```env
   DISCOGS_CONSUMER_KEY=your_actual_key
   DISCOGS_CONSUMER_SECRET=your_actual_secret
   SESSION_SECRET=$(openssl rand -base64 32)
   FRONTEND_URL=http://YOUR_SYNOLOGY_IP:3200
   NEXT_PUBLIC_API_URL=http://YOUR_SYNOLOGY_IP:3001
   ```

4. **Update Discogs OAuth Callback**
   - Go to [Discogs Developer Settings](https://www.discogs.com/settings/developers)
   - Update Callback URL to: `http://YOUR_SYNOLOGY_IP:3200/auth/callback`

### Deploy with Pre-built Images (Recommended)

The easiest way to deploy is using pre-built images from GitHub Container Registry:

```bash
ssh admin@YOUR_SYNOLOGY_IP
cd /volume1/docker/VinylApp

# Pull and start using pre-built images
docker-compose -f docker-compose.prod.yml up -d
```

### Deploy with Container Manager UI

1. Open Container Manager
2. Go to Project tab → Create
3. Configure:
   - Project Name: `vinylapp`
   - Path: Select your project folder
   - Source: `docker-compose.prod.yml` (for pre-built images) or `docker-compose.yml` (to build locally)
4. Click Next → Review → Done

### Deploy via SSH (Build from Source)

If you prefer to build from source instead of using pre-built images:

```bash
ssh admin@YOUR_SYNOLOGY_IP
cd /volume1/docker/VinylApp
docker-compose up -d --build
```

Access your app at:
- **Frontend**: `http://YOUR_SYNOLOGY_IP:3200`
- **Backend API**: `http://YOUR_SYNOLOGY_IP:3001`

### Container Management

```bash
# Start/stop services
docker-compose start
docker-compose stop

# Restart a specific service
docker-compose restart frontend

# View logs
docker-compose logs -f backend

# Remove containers (keeps data)
docker-compose down

# Remove containers and volumes (⚠️ deletes data)
docker-compose down -v
```

### Data Backup

**Using Synology Hyper Backup:**
- Include project folder in backup
- Include Docker volumes at: `/volume1/@docker/volumes/vinylapp_*`

**Manual Database Backup:**
```bash
# Backup
docker exec vinylapp-db pg_dump -U vinyl_user vinyl_collection > backup_$(date +%Y%m%d).sql

# Restore
cat backup_20231215.sql | docker exec -i vinylapp-db psql -U vinyl_user vinyl_collection
```

## Usage

### First Time Setup

1. Open the app in your browser
2. Click "Connect with Discogs"
3. Authorize the application on Discogs
4. You'll be redirected back to the app
5. Click "Sync with Discogs" to import your collection (may take 1-2 minutes for large collections)

### Generate Stacks

1. Navigate to the Setlist view
2. Your daily stack is auto-generated
3. Explore genre stacks or create custom stacks
4. Select the number of records (5-25)
5. Click "Generate Stack"

### Stack Player

1. **Pull Records View**: See your numbered stack with album art
2. Pull the records from your shelf in order
3. **Now Spinning View**:
   - Swipe through albums
   - Mark as played or skip
   - Track your listening

### Collection Management

- **Search**: Full-text search across title, artist, label
- **Sort**: By title, artist, year, date added, play count
- **Filter**: Liked albums, unlistened albums
- **Like**: Mark favorite albums
- **Play**: Track listening with one tap

## Stack Types Explained

| Type | Description | Best For |
|------|-------------|----------|
| **Daily Discovery** | Weighted toward least-played | Regular rotation variety |
| **Rare Gems** | Never or rarely played | Discovering forgotten albums |
| **Dust Collectors** | Longest time since played | Re-engaging with old favorites |
| **Recently Added** | Newest additions | Exploring new purchases |
| **Favorites** | Most played records | Playing your hits |
| **Time Machine** | Random selection | Pure serendipity |
| **Genre Stacks** | Auto-generated by genre | Mood-based listening |

## Development

### Manual Setup (Without Script)

Backend:
```bash
cd backend
npm install
npm run migrate
npm run dev
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

### Database Access

```bash
psql -U vinyl_user -d vinyl_collection
```

### API Endpoints

**Authentication:**
- `GET /api/auth/login` - Initiate OAuth flow
- `POST /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

**Collection:**
- `POST /api/collection/sync` - Sync Discogs collection
- `GET /api/collection` - Get user's vinyl records
- `GET /api/collection/stats` - Get collection statistics
- `POST /api/collection/:id/play` - Mark record as played
- `POST /api/collection/:id/like` - Like/unlike record

**Stacks:**
- `GET /api/stacks/daily` - Get daily stack
- `GET /api/stacks/genre` - Get genre stacks
- `POST /api/stacks/generate` - Generate custom stack
- `GET /api/stacks` - Get all stacks
- `GET /api/stacks/:id` - Get stack details
- `POST /api/stacks/:id/start` - Start playing a stack
- `DELETE /api/stacks/:id` - Delete stack

**Stats:**
- `GET /api/stats` - Get collection analytics

## Troubleshooting

### OAuth Issues

1. Verify Discogs API credentials in `.env`
2. Ensure callback URL matches exactly in Discogs settings
3. Check cookies are enabled
4. Confirm DATABASE_URL is correct
5. Ensure Redis is running

### Collection Not Syncing

1. Check backend logs for errors
2. Verify app authorization on Discogs
3. Ensure your Discogs collection is public

### Database Connection Issues

1. Verify PostgreSQL is running: `brew services list`
2. Check credentials in `.env`
3. Test connection: `psql -U vinyl_user -d vinyl_collection`

### Port Already in Use

```bash
# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

### Mobile Access Issues

1. Ensure mobile device is on same WiFi network
2. Check firewall settings aren't blocking connections
3. Verify local IP is correct in startup script output
4. Update Discogs callback URL to use local IP

### Docker/Synology Issues

1. **Containers Won't Start**: Check logs with `docker-compose logs`
2. **Port Conflicts**: Modify ports in `docker-compose.yml`
3. **OAuth Errors**: Verify `FRONTEND_URL` matches Synology IP
4. **Database Issues**: Check postgres container health: `docker-compose ps postgres`

## Performance Tips

1. **SSD Storage**: Place Docker volumes on SSD cache (Synology)
2. **Resource Allocation**: Give Container Manager at least 2GB RAM
3. **Redis**: Keep Redis running for session management
4. **Collection Size**: Large collections (1000+ records) may take 2-3 minutes to sync

## Security Recommendations

1. **Change Default Passwords**: Update postgres password in production
2. **Strong Session Secret**: Generate with `openssl rand -base64 32`
3. **HTTPS**: Use reverse proxy with SSL for production
4. **Firewall**: Limit access to local network or VPN
5. **Keep Updated**: Regularly update dependencies

## Future Enhancements

- Vibes-based stacks (dark/gloomy, happy/upbeat mood tags)
- Time-based stacks (stack length in minutes vs album count)
- Artist-based stacks (auto-generate by favorite artists)
- Multi-folder collection support
- Collaborative stacks
- Export stacks to Spotify/Apple Music
- Vinyl condition tracking
- Price/value tracking from Discogs marketplace
- Drag-and-drop stack reordering
- Album detail view with full Discogs data
- CSV upload for collections without Discogs

## Database Schema

Core tables:
- `users` - User accounts with preferences
- `vinyl_records` - Album collection with play tracking
- `stacks` - Generated playlists
- `stack_items` - Items in each stack
- `play_history` - Complete listening history
- `collection_stats` - Cached analytics

Run migrations:
```bash
cd backend
npm run migrate
```

## License

MIT

## Support

For issues or questions:
- Check this README first
- Review troubleshooting section
- Ensure all prerequisites are installed
- Verify environment variables are set correctly
