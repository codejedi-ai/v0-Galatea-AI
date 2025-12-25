#!/bin/bash

# Local Supabase Setup Script for Galatea AI
# This script sets up a local Supabase development environment

set -e

echo "🚀 Starting local Supabase setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker Desktop and try again."
  exit 1
fi

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
  echo "📦 Supabase CLI not found. Will use npx to run it..."
  SUPABASE_CMD="npx supabase"
else
  echo "✅ Supabase CLI found"
  SUPABASE_CMD="supabase"
fi

# Check if Supabase is already initialized
if [ ! -f "supabase/config.toml" ]; then
  echo "📝 Initializing Supabase project..."
  $SUPABASE_CMD init
else
  echo "✅ Supabase project already initialized"
fi

# Start Supabase services
echo "🔄 Starting Supabase services..."
$SUPABASE_CMD start

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 5

# Get Supabase status
echo ""
echo "📊 Supabase Status:"
$SUPABASE_CMD status

# Run migrations
echo ""
echo "🔄 Running database migrations..."
$SUPABASE_CMD db reset

echo ""
echo "✅ Local Supabase setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the environment variables from localenv.md to your .env.local file"
echo "2. Run 'npm run dev' to start the Next.js development server"
echo ""
echo "🌐 Access points:"
echo "   - API URL: http://127.0.0.1:54321"
echo "   - Studio URL: http://127.0.0.1:54323"
echo "   - Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres"
echo ""

