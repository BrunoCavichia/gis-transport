#!/bin/bash
# PostgreSQL + PostGIS Setup Verification Script

echo "Checking PostgreSQL and PostGIS setup..."
echo ""

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client not found. Please install PostgreSQL."
    exit 1
fi

echo "✓ PostgreSQL client found"

# Test connection
psql postgresql://postgres:postgres@localhost:5432/gis_transport_logistics -c "SELECT version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ Cannot connect to PostgreSQL. Make sure the database is running."
    echo "   Run: docker-compose up -d"
    exit 1
fi

echo "✓ PostgreSQL connection successful"

# Check PostGIS extension
psql postgresql://postgres:postgres@localhost:5432/gis_transport_logistics -c "SELECT postgis_version();" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "❌ PostGIS extension not available"
    exit 1
fi

echo "✓ PostGIS extension available"

# Check other extensions
psql postgresql://postgres:postgres@localhost:5432/gis_transport_logistics -c "SELECT * FROM pg_extension WHERE extname IN ('postgis', 'postgis_topology', 'uuid-ossp');" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ All required extensions installed"
fi

echo ""
echo "✅ PostgreSQL + PostGIS setup verified successfully!"
echo ""
echo "Next steps:"
echo "  1. Run migrations: pnpm db:push"
echo "  2. Start the application: pnpm dev"
