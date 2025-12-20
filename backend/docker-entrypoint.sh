#!/bin/sh
set -e

echo "Waiting for database to be ready..."
sleep 5

echo "Running database migrations..."
node src/db/migrate.js

echo "Starting application..."
exec node src/index.js
