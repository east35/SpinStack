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
- **Infrastructure**: Docker Compose

## Prerequisites

- Docker and Docker Compose installed
- Discogs account with API credentials

## Setup Instructions

### 1. Get Discogs API Credentials

1. Go to [https://www.discogs.com/settings/developers](https://www.discogs.com/settings/developers)
2. Click "Create an App"
3. Fill in the application details:
   - **Application Name**: Vinyl Collection (or your choice)
   - **Application URL**: http://localhost:3000
   - **Callback URL**: http://localhost:3000/auth/callback
4. Save the **Consumer Key** and **Consumer Secret**

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` and add your Discogs credentials and URLs:

```env
DISCOGS_CONSUMER_KEY=your_consumer_key_here
DISCOGS_CONSUMER_SECRET=your_consumer_secret_here
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
SESSION_SECRET=generate-a-random-string-here
DISCOGS_USER_AGENT=VinylApp/1.0 (+https://your-site-or-email.example)
```

To generate a secure session secret:
```bash
openssl rand -base64 32
```

### 3. Start the Application

```bash
docker-compose up --build
```

This will:
- Start PostgreSQL database on port 5432
- Start Redis on port 6379
- Start the backend API on port 3001
- Start the frontend on port 3000

### 4. Run Database Migrations

In a new terminal, run:

```bash
docker exec -it vinyl-backend npm run migrate
```

### 5. Access the Application

Open your browser to [http://localhost:3000](http://localhost:3000)

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

### Backend Development

```bash
cd backend
npm install
npm run dev  # runs on http://localhost:3201
```

### Frontend Development

```bash
cd frontend
npm install
npm run dev  # runs on http://localhost:3202
```
> Make sure backend and frontend use different ports. Backend expects `FRONTEND_URL=http://<host>:3202` and frontend should call the API at `http://<host>:3201`.

### Database Access

Connect to PostgreSQL:
```bash
docker exec -it vinyl-db psql -U vinyl_user -d vinyl_collection
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

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
1. Verify your Discogs API credentials in `.env`
2. Make sure the callback URL in Discogs settings matches `http://localhost:3000/auth/callback`
3. Check that cookies are enabled in your browser
4. Confirm PostgreSQL is reachable and `DATABASE_URL` matches the database name (default: `vinyl_collection`). With Docker Compose this is set for you, but a mismatched DB name will surface as OAuth callback failures in the backend logs.

### Collection Not Syncing

1. Check backend logs: `docker-compose logs backend`
2. Verify you've authorized the app correctly
3. Ensure your Discogs collection is public

### Database Connection Issues

```bash
# Restart database
docker-compose restart postgres

# Check database is healthy
docker-compose ps
```

## Deployment to NAS

The application is designed to run on your NAS via Docker Compose:

1. Copy the entire project to your NAS
2. Update `.env` with your credentials
3. Run `docker-compose up -d` to start in detached mode
4. Access via your NAS IP: `http://YOUR_NAS_IP:3000`

### Production Considerations

- Update `SESSION_SECRET` to a strong random value
- Consider using HTTPS with a reverse proxy (nginx/Caddy)
- Set up regular backups of the PostgreSQL volume
- Adjust `docker-compose.yml` to remove dev-specific volume mounts

## Future Enhancements

- Genre-based filtering
- Multi-folder support
- Collaborative playlists
- Export playlists to Spotify/Apple Music
- Vinyl condition tracking
- Price/value tracking from Discogs marketplace

## License

MIT
