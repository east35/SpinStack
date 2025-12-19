#!/bin/bash

# Vinyl Collection App - Local Development Setup
# This script sets up PostgreSQL and Redis locally without Docker

set -e

echo "====================================="
echo "Vinyl Collection - Local Dev Setup"
echo "====================================="
echo ""

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo "Error: Homebrew is not installed."
    echo "Install it from: https://brew.sh"
    exit 1
fi

# Install PostgreSQL
echo "📦 Installing PostgreSQL 16..."
if brew list postgresql@16 &> /dev/null; then
    echo "✓ PostgreSQL 16 already installed"
else
    brew install postgresql@16
    echo "✓ PostgreSQL 16 installed"
fi

# Install Redis
echo "📦 Installing Redis..."
if brew list redis &> /dev/null; then
    echo "✓ Redis already installed"
else
    brew install redis
    echo "✓ Redis installed"
fi

# Start services
echo ""
echo "🚀 Starting services..."
brew services start postgresql@16
brew services start redis
echo "✓ PostgreSQL and Redis started"

# Wait for PostgreSQL to be ready
echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 3

# Find psql command
if command -v psql &> /dev/null; then
    PSQL="psql"
elif [ -f "/opt/homebrew/bin/psql" ]; then
    PSQL="/opt/homebrew/bin/psql"
elif [ -f "/usr/local/bin/psql" ]; then
    PSQL="/usr/local/bin/psql"
else
    echo "Error: psql not found. Adding Homebrew PostgreSQL to PATH..."
    export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
    PSQL="psql"
fi

# Create database and user
echo "🗄️  Setting up database..."
if $PSQL postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='vinyl_user'" 2>/dev/null | grep -q 1; then
    echo "✓ User 'vinyl_user' already exists"
else
    $PSQL postgres -c "CREATE USER vinyl_user WITH PASSWORD 'vinyl_pass';" 2>/dev/null || echo "✓ User 'vinyl_user' already exists"
    echo "✓ Created user 'vinyl_user'"
fi

if $PSQL postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw vinyl_collection; then
    echo "✓ Database 'vinyl_collection' already exists"
else
    $PSQL postgres -c "CREATE DATABASE vinyl_collection OWNER vinyl_user;" 2>/dev/null || echo "✓ Database 'vinyl_collection' already exists"
    echo "✓ Created database 'vinyl_collection'"
fi

# Grant privileges
$PSQL postgres -c "GRANT ALL PRIVILEGES ON DATABASE vinyl_collection TO vinyl_user;" &> /dev/null

# Copy environment file if .env doesn't exist
if [ ! -f .env ]; then
    if [ -f .env.local ]; then
        cp .env.local .env
        echo "✓ Created .env from .env.local"
    else
        echo "⚠️  Warning: No .env file found. Copy .env.example to .env and add your Discogs credentials."
    fi
fi

# Copy .env to backend directory
if [ -f .env ]; then
    cp .env backend/.env
    echo "✓ Copied .env to backend directory"
fi

# Install backend dependencies
echo ""
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✓ Backend dependencies installed"

# Run migrations
echo ""
echo "🔄 Running database migrations..."
npm run migrate
echo "✓ Database migrations complete"

# Install frontend dependencies
cd ../frontend
echo ""
echo "📦 Installing frontend dependencies..."
npm install
echo "✓ Frontend dependencies installed"

cd ..

echo ""
echo "======================================"
echo "✅ Setup complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "1. Make sure your .env file has your Discogs API credentials"
echo "2. Run: ./start-local.sh"
echo ""
echo "Useful commands:"
echo "  Stop services: brew services stop postgresql@16 redis"
echo "  Start services: brew services start postgresql@16 redis"
echo "  View PostgreSQL logs: tail -f /opt/homebrew/var/log/postgresql@16.log"
echo ""
