# Quick start script for GIS Transport Logistics with PostgreSQL + PostGIS (Windows PowerShell)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "🚀 Starting GIS Transport Logistics Setup..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Start PostgreSQL with PostGIS
Write-Host "Step 1: Starting PostgreSQL + PostGIS with Docker..." -ForegroundColor Yellow
docker-compose up -d
Start-Sleep -Seconds 5

# Step 2: Verify PostgreSQL is running
Write-Host "Step 2: Verifying PostgreSQL connection..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 1
$connected = $false

while ($attempt -le $maxAttempts) {
  try {
    docker-compose exec -T postgres pg_isready -U postgres 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
      Write-Host "✓ PostgreSQL is running" -ForegroundColor Green
      $connected = $true
      break
    }
  }
  catch {
    # Continue trying
  }
  
  Write-Host "Waiting for PostgreSQL to be ready... ($attempt/$maxAttempts)"
  Start-Sleep -Seconds 1
  $attempt++
}

if (-not $connected) {
  Write-Host "✗ PostgreSQL failed to start" -ForegroundColor Red
  exit 1
}

# Step 3: Verify PostGIS extension
Write-Host "Step 3: Verifying PostGIS extension..." -ForegroundColor Yellow
try {
  docker-compose exec -T postgres psql -U postgres -d gis_transport_logistics -c "SELECT postgis_version();" 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostGIS extension is available" -ForegroundColor Green
  }
}
catch {
  Write-Host "✗ PostGIS extension not found" -ForegroundColor Red
  exit 1
}

# Step 4: Generate Prisma Client
Write-Host "Step 4: Generating Prisma Client..." -ForegroundColor Yellow
pnpm db:generate

# Step 5: Run migrations
Write-Host "Step 5: Running database migrations..." -ForegroundColor Yellow
pnpm db:push

# Step 6: Verify tables were created
Write-Host "Step 6: Verifying schema..." -ForegroundColor Yellow
$tableCheck = docker-compose exec -T postgres psql -U postgres -d gis_transport_logistics -c "\dt" 2>$null
if ($tableCheck -match "OptimizationSnapshot") {
  Write-Host "✓ Database schema created successfully" -ForegroundColor Green
}
else {
  Write-Host "✗ Database schema creation failed" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Start the development server: pnpm dev"
Write-Host "  2. Open http://localhost:3000 in your browser"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  - View database in Prisma Studio: pnpm db:studio"
Write-Host "  - View PostgreSQL directly: docker-compose exec postgres psql -U postgres -d gis_transport_logistics"
Write-Host "  - Stop database: docker-compose down"
Write-Host "  - Reset database: docker-compose down -v && docker-compose up -d"
