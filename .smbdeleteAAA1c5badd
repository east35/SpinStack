#!/bin/bash

# Vinyl Collection App - Local Development Startup (Mobile Testing)
# Starts backend and frontend accessible from mobile devices on same network

set -e

# Get the local IP address
get_local_ip() {
    # Try to get the main local network IP (192.168.x.x)
    ifconfig | grep "inet " | grep -v 127.0.0.1 | grep "192.168" | head -n 1 | awk '{print $2}'
}

LOCAL_IP=$(get_local_ip)

if [ -z "$LOCAL_IP" ]; then
    echo "❌ Could not detect local IP address"
    echo "Please check your network connection"
    exit 1
fi

echo "====================================="
echo "🎵 Vinyl Collection - Mobile Testing"
echo "====================================="
echo ""
echo "📱 Local IP: $LOCAL_IP"
echo ""

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

# Override environment variables for mobile access
export FRONTEND_URL="http://$LOCAL_IP:3000"
export NEXT_PUBLIC_API_URL="http://$LOCAL_IP:3001"

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

echo "Starting services..."
echo ""
echo "📍 Frontend: http://$LOCAL_IP:3000"
echo "📍 Backend API: http://$LOCAL_IP:3001"
echo ""
echo "🔧 On your mobile device (same WiFi):"
echo "   Open: http://$LOCAL_IP:3000"
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
