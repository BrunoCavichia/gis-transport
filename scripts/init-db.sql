-- Initialize PostgreSQL extensions for PostGIS support
-- This script is automatically run when the PostgreSQL container starts

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable PostGIS topology support
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Enable uuid generation function
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Verify extensions are enabled
SELECT * FROM pg_extension WHERE extname IN ('postgis', 'postgis_topology', 'uuid-ossp');
