# Quick Start Guide

## Choose Your Setup Method

**Option A: Local Development (Recommended)** - Faster startup, easier debugging
**Option B: Docker** - Isolated environment, closer to production

## Prerequisites

### For Local Development (Option A)
- [ ] Homebrew installed (macOS)
- [ ] Discogs account created
- [ ] Discogs API credentials obtained

### For Docker (Option B)
- [ ] Docker installed and running
- [ ] Discogs account created
- [ ] Discogs API credentials obtained

## Get API Credentials (5 minutes)

1. Visit: https://www.discogs.com/settings/developers
2. Click "Create an App"
3. Fill in:
   - Name: `Vinyl Collection`
   - URL: `http://localhost:3000`
   - Callback: `http://localhost:3000/auth/callback`
4. Save the **Consumer Key** and **Consumer Secret**

## Setup

### Option A: Local Development (Recommended)

**One-time setup (5 minutes):**

```bash
# Run the setup script - installs PostgreSQL, Redis, and dependencies
./setup-local.sh
```

This script will:
- Install PostgreSQL 16 and Redis via Homebrew
- Create the database and user
- Install all npm dependencies
- Run database migrations

**Starting the app (every time):**

```bash
# Start both frontend and backend
./start-local.sh
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

Press `Ctrl+C` to stop all services.

**Managing local services:**

```bash
# Stop PostgreSQL and Redis
brew services stop postgresql@16 redis

# Start PostgreSQL and Redis
brew services start postgresql@16 redis

# Check service status
brew services list
```

### Option B: Docker

```bash
# 1. Create environment file
cp .env.example .env

# 2. Edit .env and add your Discogs credentials and URLs
nano .env

# 3. Start the application
./start.sh
```

Or manually:

```bash
# Start services
docker-compose up -d

# Wait 10 seconds for services to start
sleep 10

# Run migrations
docker exec -it vinyl-backend npm run migrate
```

## Access

- **App**: http://localhost:3000
- **API**: http://localhost:3001

Make sure your `.env` includes:
- `DISCOGS_CONSUMER_KEY` / `DISCOGS_CONSUMER_SECRET`
- `FRONTEND_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3001`
- `DISCOGS_USER_AGENT` (any app-identifying string; Discogs requires it)

## First Steps

1. Open http://localhost:3000
2. Click "Connect with Discogs"
3. Authorize on Discogs website
4. Click "Sync with Discogs" (may take 1-2 minutes)
5. Navigate to "Generate Playlist"
6. Select playlist type and generate

## Common Commands

```bash
# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Restart services
docker-compose restart

# Stop services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Rebuild after code changes
docker-compose up --build
```

## Troubleshooting

### "Failed to sync collection"
- Check backend logs: `docker-compose logs backend`
- Verify Discogs credentials in `.env`
- Ensure your Discogs collection is not empty

### OAuth errors
- Verify callback URL in Discogs app settings
- Clear browser cookies and try again
- Check `.env` has correct credentials

### Container won't start
```bash
# Check status
docker-compose ps

# Restart all
docker-compose down
docker-compose up -d
```

## Playlist Types Explained

| Type | Description | Best For |
|------|-------------|----------|
| **Daily Discovery** | Weighted toward least-played | Regular rotation variety |
| **Rare Gems** | Never or rarely played | Discovering forgotten albums |
| **Dust Collectors** | Longest time since played | Re-engaging with old favorites |
| **Recently Added** | Newest additions | Exploring new purchases |
| **Favorites** | Most played records | Playing your hits |
| **Time Machine** | Random selection | Pure serendipity |

## What's Next?

- Sync your collection daily to catch new additions
- Generate multiple playlist types to compare
- Track your listening by marking records as played
- Watch your stats grow over time

Enjoy rediscovering your vinyl collection!
