# SpinStack Demo Site Deployment Guide

This guide explains how to deploy the SpinStack demo site to Netlify.

## Overview

The demo mode allows users to explore SpinStack with a sample vinyl collection without needing to connect their Discogs account. All interactions (likes, play counts) are stored in localStorage.

## Features in Demo Mode

- ✅ Browse collection (383 albums from real collection data)
- ✅ Search and filter by genre
- ✅ Sort albums
- ✅ View stats and analytics
- ✅ Daily and weekly stacks
- ✅ Like albums (persisted in localStorage)
- ✅ Mark albums as played (persisted in localStorage)
- ✅ Product roadmap view
- ❌ Discogs sync (demo only)
- ❌ CSV import (redirect to roadmap)

## Deployment Steps

### 1. Prepare the Repository

The branch `feature/demo-site` contains all the demo mode implementation.

### 2. Deploy to Netlify

#### Option A: Deploy via Netlify UI

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider and select the VinylApp repository
4. Configure build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/.next`
   - **Branch**: `feature/demo-site`
5. Add environment variables (optional - demo works without backend):
   - `NEXT_PUBLIC_API_URL`: Leave empty (will use demo mode by default)
6. Click "Deploy site"

#### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Navigate to frontend directory
cd frontend

# Deploy
netlify deploy --prod
```

### 3. Configure Demo Mode as Default

The demo mode will automatically activate when:
1. User clicks "Explore Demo" on the login page
2. No backend API is available (perfect for static hosting)

### 4. Post-Deployment

After deployment:
1. Test all features in demo mode
2. Verify localStorage persistence works
3. Check that roadmap modal displays correctly
4. Ensure all stacks load properly

## Technical Architecture

### Demo Mode Implementation

- **Entry Point**: User clicks "Explore Demo" → `enableDemoMode()` → sets `spinstack_demo_mode=true` in localStorage
- **API Layer**: `api.js` wraps all API calls and routes to mock data when `isDemoMode()` returns true
- **Mock Data Service**: `mockDataService.js` provides in-memory collection with localStorage persistence
- **Data Source**: `mockData.json` (140KB) contains 383 real vinyl records exported from Discogs

### File Structure

```
frontend/
├── lib/
│   ├── api.js              # Main API with demo mode wrapper
│   ├── demoApi.js          # Demo mode API implementation
│   ├── mockDataService.js  # Mock data operations with localStorage
│   └── mockData.json       # Exported collection data (383 albums)
├── components/
│   ├── Login.js            # Updated with "Explore Demo" button
│   └── RoadmapModal.js     # Product roadmap display
└── app/
    └── page.js             # Main app entry point

scripts/
└── export-mock-data.js     # Script to regenerate mock data from database
```

## Updating Mock Data

To refresh the demo collection with updated data:

```bash
# From project root
NODE_PATH=backend/node_modules node scripts/export-mock-data.js
```

This will:
1. Connect to your local database
2. Export all vinyl records
3. Generate stacks and stats
4. Save to `frontend/lib/mockData.json`

## Environment Variables

For Netlify deployment, NO environment variables are required for demo mode. The app will work completely standalone.

Optional variables if you want to allow real Discogs login:
- `NEXT_PUBLIC_API_URL`: URL to backend API (for non-demo users)

## Troubleshooting

### Demo Mode Not Activating

- Check browser localStorage: `localStorage.getItem('spinstack_demo_mode')` should return `"true"`
- Clear localStorage and try again: `localStorage.clear()`

### Data Not Persisting

- Ensure browser allows localStorage
- Check browser console for storage quota errors
- Try in incognito/private browsing mode

### Build Failures

- Verify `mockData.json` exists in `frontend/lib/`
- Check that all imports are correct (Next.js App Router requires 'use client')
- Review Netlify build logs for specific errors

## Performance

- **Mock data size**: 140KB (gzips well)
- **Initial load**: Fast (no API calls)
- **Subsequent interactions**: Instant (all client-side)
- **Storage**: ~2KB localStorage for user interactions

## Future Enhancements

See the Roadmap modal in the app for planned features, including:
- Custom stack builder
- Data export
- Wishlist tracker
- Advanced analytics

## Support

For issues or questions:
- Check GitHub Issues
- Review this deployment guide
- Test locally first: `cd frontend && npm run dev`
