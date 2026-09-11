#!/bin/sh
set -e

HOST="${DB_HOST:-mssql}"
PORT="${DB_PORT:-1433}"

echo "Waiting for SQL Server at $HOST:$PORT..."
until nc -z "$HOST" "$PORT"; do
  sleep 2
done
echo "SQL Server is reachable."

echo "Applying database schema (prisma db push)..."
npx prisma db push --skip-generate

echo "Starting server..."
exec "$@"
