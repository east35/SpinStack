# SpinStack - Rebuild Complete

## What We Built

SpinStack is a vinyl collection manager that helps you decide what to listen to by creating dynamic playlists (called "stacks") based on various criteria.

## Architecture

### Backend (Node.js/Express/PostgreSQL)
- **Database**: PostgreSQL with Redis sessions
- **Authentication**: OAuth with Discogs (preserved from original)
- **New Tables**:
  - `users` - Added `stack_count` preference
  - `vinyl_records` - Added `listened_count`, `is_liked`, `last_played_at`
  - `stacks` - Renamed from playlists to match SpinStack terminology
  - `stack_items` - Items in each stack with play tracking
  - `play_history` - Track every play for analytics
  - `collection_stats` - Cached stats for performance

### Backend Routes
- `/api/auth` - Login, logout, user preferences
- `/api/collection` - Sync, search, filter, sort, like, mark played
- `/api/stacks` - Daily stacks, genre stacks, custom stacks, start/stop
- `/api/stats` - Collection statistics and analytics
- `/api/playlists` - Legacy playlist generation (kept for compatibility)

### Frontend (Next.js/React/Tailwind)
- **Login** - OAuth flow with Discogs
- **SpinStackDashboard** - Main container with view switching
- **TopNav** - User menu with logout and preferences
- **SetlistView** - Daily stack + previous stacks + genre stacks
- **CollectionView** - Full collection with search, sort, filter
- **StatsView** - Collection analytics and insights
- **StackPlayer** - Two-phase player:
  1. Pull Records view - Shows numbered albums to pull
  2. Now Spinning view - Swipe through albums, mark played/skipped

## Key Features Implemented

### Stacks (Core Feature)
- **Daily Stack**: Auto-generated daily playlist weighted toward unlistened records
- **Genre Stacks**: Auto-generated stacks for each genre in collection
- **Custom Stacks**: User-created stacks with custom criteria
- **Stack Player**:
  - Pull Records view with numbered albums
  - Now Spinning view with current album and stack preview
  - Mark as played/skipped functionality

### Collection Management
- **Sync with Discogs**: Import full collection
- **Search**: Full-text search across title, artist, label
- **Sort**: By title, artist, year, date added, play count
- **Filter**: Liked albums, unlistened albums
- **Album Actions**: Like/unlike, mark as played

### Stats & Analytics
- Total records, listened/unlistened counts
- Favorite genre and artist (by play count)
- Top genres and artists by collection size
- Most played albums
- Dusty gems (never or rarely played)
- Recent activity

## Running the Application

### Backend
```bash
cd backend
DATABASE_URL=postgresql://vinyl_user:vinyl_pass@localhost:5432/vinyl_collection \
REDIS_URL=redis://127.0.0.1:6379 \
npm start
```
Server runs on http://localhost:3001

### Frontend
```bash
cd frontend
npm run dev
```
App runs on http://localhost:3000

## Environment Variables

See `.env.example` for required variables:
- `DISCOGS_CONSUMER_KEY` - From Discogs API settings
- `DISCOGS_CONSUMER_SECRET` - From Discogs API settings
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `SESSION_SECRET` - Random secret for sessions
- `FRONTEND_URL` - Frontend URL (for OAuth callback)
- `NEXT_PUBLIC_API_URL` - Backend API URL

## Database Schema

Run migrations:
```bash
cd backend
npm run migrate
```

This creates all necessary tables with proper indexes and constraints.

## What's Next (Future Enhancements)

Based on the original spec, these features could be added:

1. **Vibes-based stacks** - Tag albums with moods (dark/gloomy, happy/upbeat)
2. **Time-based stacks** - Stack length in minutes vs album count
3. **Rare gems stack** - Based on Discogs value data
4. **Artist-based stacks** - Auto-generate by favorite artists
5. **Dusty gems stack** - Old collection entries
6. **Drag-and-drop reordering** - In Pull Records view
7. **Mobile optimizations** - Touch gestures for Now Spinning
8. **Album detail view** - Full Discogs data integration
9. **CSV upload** - Import without Discogs account
10. **Collection value tracking** - Use Discogs marketplace data

## Tech Stack

- **Backend**: Node.js, Express, PostgreSQL, Redis
- **Frontend**: Next.js 14, React, Tailwind CSS
- **API Integration**: Discogs OAuth 1.0a
- **Session Management**: express-session with Redis store

## Notes

- Auth is fully functional (OAuth with Discogs)
- All backend routes are implemented and tested
- Frontend components follow the Figma designs
- Database schema supports all core features
- Both servers are currently running and accessible
