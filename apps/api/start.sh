#!/bin/sh
set -e

echo "[worka-start] Running database migrations..."
node /repo/apps/api/node_modules/prisma/build/index.js migrate deploy

echo "[worka-start] Migrations complete. Starting Nest API on port ${PORT:-3000}..."
exec node /repo/apps/api/dist/main.js
