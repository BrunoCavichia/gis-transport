#!/usr/bin/env bash
# Quick start script for GIS Transport Logistics with PostgreSQL + PostGIS

set -e

echo "🚀 Starting GIS Transport Logistics Setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Start PostgreSQL with PostGIS
echo -e "${YELLOW}Step 1: Starting PostgreSQL + PostGIS with Docker...${NC}"
docker-compose up -d
sleep 5

# Step 2: Verify PostgreSQL is running
echo -e "${YELLOW}Step 2: Verifying PostgreSQL connection...${NC}"
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
  if docker-compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL is running${NC}"
    break
  fi
  echo "Waiting for PostgreSQL to be ready... ($attempt/$max_attempts)"
  sleep 1
  ((attempt++))
done

if [ $attempt -gt $max_attempts ]; then
  echo -e "${RED}✗ PostgreSQL failed to start${NC}"
  exit 1
fi

# Step 3: Verify PostGIS extension
echo -e "${YELLOW}Step 3: Verifying PostGIS extension...${NC}"
if docker-compose exec -T postgres psql -U postgres -d gis_transport_logistics -c "SELECT postgis_version();" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ PostGIS extension is available${NC}"
else
  echo -e "${RED}✗ PostGIS extension not found${NC}"
  exit 1
fi

# Step 4: Generate Prisma Client
echo -e "${YELLOW}Step 4: Generating Prisma Client...${NC}"
pnpm db:generate

# Step 5: Run migrations
echo -e "${YELLOW}Step 5: Running database migrations...${NC}"
pnpm db:push

# Step 6: Verify tables were created
echo -e "${YELLOW}Step 6: Verifying schema...${NC}"
if docker-compose exec -T postgres psql -U postgres -d gis_transport_logistics -c "\dt" | grep -q "OptimizationSnapshot"; then
  echo -e "${GREEN}✓ Database schema created successfully${NC}"
else
  echo -e "${RED}✗ Database schema creation failed${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Start the development server: pnpm dev"
echo "  2. Open http://localhost:3000 in your browser"
echo ""
echo "Useful commands:"
echo "  - View database in Prisma Studio: pnpm db:studio"
echo "  - View PostgreSQL directly: docker-compose exec postgres psql -U postgres -d gis_transport_logistics"
echo "  - Stop database: docker-compose down"
echo "  - Reset database: docker-compose down -v && docker-compose up -d"
