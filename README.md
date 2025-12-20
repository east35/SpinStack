# Vinyl Collection App

A Spotify/Tidal-inspired web app for your physical vinyl collection. Generate playlists, track listening stats, and rediscover forgotten gems from your Discogs collection.

## Features

- **Discogs Integration**: Sync your entire vinyl collection via Discogs OAuth
- **Smart Playlists**: Generate playlists based on different algorithms:
  - Daily Discovery: Weighted toward least-played records
  - Rare Gems: Never or rarely played records
  - Dust Collectors: Records you haven't played in the longest time
  - Recently Added: Your newest acquisitions
  - Favorites: Most played records
  - Time Machine: Random selection from your collection
- **Listening Stats**: Track play counts and listening history
- **Mobile-First Design**: Clean, Tidal-inspired interface that puts album art front and center

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Frontend**: Next.js 14, React, Tailwind CSS

## Deployment Options

### 🐳 Docker (Recommended for Synology NAS)
Perfect for running on Synology Container Manager or any Docker environment.

**See [DEPLOYMENT.md](DEPLOYMENT.md) for full Synology setup guide.**

Quick start:
```bash
cp .env.example .env
# Edit .env with your settings
docker-compose up -d
```

### 💻 Local Development
For development or running without Docker.

## Prerequisites

### For Docker Deployment
- Docker and Docker Compose
- Discogs account with API credentials

### For Local Development
- Node.js 18+ and npm
- PostgreSQL 14+
- Redis 6+
- Discogs account with API credentials

## Setup Instructions (Local Development)

### 1. Get Discogs API Credentials

1. Go to [https://www.discogs.com/settings/developers](https://www.discogs.com/settings/developers)
2. Click "Create an App"
3. Fill in the application details:
   - **Application Name**: Vinyl Collection (or your choice)
   - **Application URL**: http://localhost:3000
   - **Callback URL**: http://localhost:3000/auth/callback
4. Save the **Consumer Key** and **Consumer Secret**

### 2. Set Up PostgreSQL Database

Create the database and user:

```sql
CREATE DATABASE vinyl_collection;
CREATE USER vinyl_user WITH PASSWORD 'vinyl_pass';
GRANT ALL PRIVILEGES ON DATABASE vinyl_collection TO vinyl_user;
```

### 3. Configure Environment Variables

Create `backend/.env`:

```env
DISCOGS_CONSUMER_KEY=your_consumer_key_here
DISCOGS_CONSUMER_SECRET=your_consumer_secret_here
SESSION_SECRET=generate-a-random-string-here
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://vinyl_user:vinyl_pass@localhost:5432/vinyl_collection
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

To generate a secure session secret:
```bash
openssl rand -base64 32
```

### 4. Install Dependencies

Backend:
```bash
cd backend
npm install
```

Frontend:
```bash
cd frontend
npm install
```

### 5. Run Database Migrations

```bash
cd backend
npm run migrate
```

### 6. Start the Application

In one terminal, start the backend:
```bash
cd backend
npm run dev
```

In another terminal, start the frontend:
```bash
cd frontend
npm run dev
```

The app will be available at:
- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:3001](http://localhost:3001)

## Usage

### First Time Setup

1. Click "Connect with Discogs"
2. Authorize the application on Discogs
3. You'll be redirected back to the app
4. Click "Sync with Discogs" to import your collection (this may take a minute for large collections)

### Generate Playlists

1. Navigate to the "Generate Playlist" tab
2. Select a playlist type
3. Choose the number of records (5-25)
4. Click "Generate Playlist"
5. Your custom playlist will appear with all the records you should pull from your shelf

### Track Listening

- Click the "+" button on any record to mark it as played
- This updates your listening stats and affects future playlist generation

## Development

### Database Access

Connect to PostgreSQL:
```bash
psql -U vinyl_user -d vinyl_collection
```

### View Logs

Backend and frontend logs will appear in their respective terminal windows.

## API Endpoints

### Authentication
- `GET /api/auth/login` - Initiate OAuth flow
- `POST /api/auth/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout

### Collection
- `POST /api/collection/sync` - Sync Discogs collection
- `GET /api/collection` - Get user's vinyl records
- `GET /api/collection/stats` - Get collection statistics
- `POST /api/collection/:id/play` - Mark record as played

### Playlists
- `POST /api/playlists/generate` - Generate auto playlist
- `GET /api/playlists` - Get all playlists
- `GET /api/playlists/:id` - Get playlist details
- `DELETE /api/playlists/:id` - Delete playlist

## Troubleshooting

### OAuth Issues

If you get OAuth errors:
1. Verify your Discogs API credentials in `backend/.env`
2. Make sure the callback URL in Discogs settings matches `http://localhost:3000/auth/callback`
3. Check that cookies are enabled in your browser
4. Confirm PostgreSQL is reachable and `DATABASE_URL` matches the database name (default: `vinyl_collection`)
5. Ensure Redis is running (`redis-server`)

### Collection Not Syncing

1. Check backend terminal for error logs
2. Verify you've authorized the app correctly
3. Ensure your Discogs collection is public

### Database Connection Issues

1. Make sure PostgreSQL is running
2. Verify credentials in `backend/.env` match your database setup
3. Test connection: `psql -U vinyl_user -d vinyl_collection`

### Port Already in Use

If you get "port already in use" errors:
```bash
# Find and kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9

# Find and kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9
```

## Future Enhancements

- Genre-based filtering
- Multi-folder support
- Collaborative playlists
- Export playlists to Spotify/Apple Music
- Vinyl condition tracking
- Price/value tracking from Discogs marketplace

## License

MIT
