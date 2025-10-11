-- Initial database setup
-- This file runs when the Postgres container starts for the first time

-- Create extension for UUID generation (if needed in future)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create extension for crypto functions (for encrypted data)
CREATE EXTENSION IF NOT EXISTS pgcrypto;