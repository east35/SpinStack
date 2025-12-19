#!/bin/bash

# Vinyl Collection App - Local Development Startup
# Starts backend and frontend without Docker

set -e

# Load environment variables (.env then .env.local overrides)
load_env_file() {
    local file="$1"
    if [ -f "$file" ]; then
        # shellcheck disable=SC1091
        set -a
        source "$file"
        set +a
    fi
}

if [ ! -f .env ] && [ ! -f .env.local ]; then
    echo "⚠️  Warning: no .env or .env.local file found"
    echo "Run ./setup-local.sh first or copy .env.example to .env"
    exit 1
fi

load_env_file ".env"
load_env_file ".env.local"

# Check if PostgreSQL is running
if ! brew services list | grep postgresql@16 | grep -q started; then
    echo "Starting PostgreSQL..."
    brew services start postgresql@16
    sleep 2
fi

# Check if Redis is running
if ! brew services list | grep redis | grep -q started; then
    echo "Starting Redis..."
    brew services start redis
    sleep 1
fi

echo "====================================="
echo "🎵 Vinyl Collection - Local Dev"
echo "====================================="
echo ""
echo "Starting services..."
echo ""
echo "📍 Frontend: http://localhost:3000"
echo "📍 Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $(jobs -p) 2>/dev/null
    wait
    echo "✓ All services stopped"
}

trap cleanup EXIT INT TERM

# Start backend
cd backend
echo "🚀 Starting backend on port 3001..."
npm run dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
cd ../frontend
echo "🚀 Starting frontend on port 3000..."
npm run dev &
FRONTEND_PID=$!

# Wait for all background processes
wait
