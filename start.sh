#!/bin/bash

echo "🎵 Vinyl Collection App - Quick Start"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found!"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo ""
    echo "📝 Please edit .env and add your Discogs API credentials:"
    echo "   1. Get credentials from: https://www.discogs.com/settings/developers"
    echo "   2. Edit .env file with your keys"
    echo "   3. Run this script again"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🚀 Starting services..."
docker-compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

echo ""
echo "📊 Running database migrations..."
docker exec -it vinyl-backend npm run migrate

echo ""
echo "✅ Application is ready!"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔌 Backend:  http://localhost:3001"
echo ""
echo "📖 Next steps:"
echo "   1. Open http://localhost:3000 in your browser"
echo "   2. Click 'Connect with Discogs'"
echo "   3. Authorize the application"
echo "   4. Sync your collection"
echo "   5. Start generating playlists!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop:      docker-compose down"
echo ""
