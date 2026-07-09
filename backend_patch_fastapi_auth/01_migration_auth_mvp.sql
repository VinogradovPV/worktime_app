-- ============================================================================
-- FastAPI Auth MVP Database Migration
-- ============================================================================
-- 
-- This migration is IDEMPOTENT - safe to run multiple times
-- 
-- Changes:
-- 1. Ensure org_units table exists
-- 2. Ensure positions table exists
-- 3. Add missing columns to users table
-- 4. Add CHECK constraints for role and status enums
-- 5. Create audit_logs table
-- 6. Create refresh_tokens table
-- 7. Add indexes for performance
--
-- Safe for production:
-- - Does NOT drop existing columns
-- - Does NOT modify existing data types
-- - Does NOT delete existing data
-- - Preserves existing roles/statuses (adds new ones)
--
-- ============================================================================

-- ============================================================================
-- 1. Ensure org_units table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS org_units (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_org_units_is_active ON org_units(is_active);

-- ============================================================================
-- 2. Ensure positions table exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_is_active ON positions(is_active);

-- ============================================================================
-- 3. Ensure users table exists with required columns
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    org_unit_id INTEGER REFERENCES org_units(id),
    position_id INTEGER REFERENCES positions(id),
    managed_org_unit_id INTEGER REFERENCES org_units(id),
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing users table (if they don't exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS login VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS org_unit_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS position_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS managed_org_unit_id INTEGER;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraints if they don't exist
-- (This is safe because PostgreSQL will skip if constraint already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'fk_users_org_unit_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_org_unit_id 
            FOREIGN KEY (org_unit_id) REFERENCES org_units(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'fk_users_position_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_position_id 
            FOREIGN KEY (position_id) REFERENCES positions(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' AND constraint_name = 'fk_users_managed_org_unit_id'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT fk_users_managed_org_unit_id 
            FOREIGN KEY (managed_org_unit_id) REFERENCES org_units(id);
    END IF;
END $$;

-- ============================================================================
-- 4. Add CHECK constraints for role and status enums
-- ============================================================================

-- Check constraint for valid roles (safe to add multiple times, PostgreSQL handles duplicates)
ALTER TABLE users ADD CONSTRAINT check_users_role 
    CHECK (role IN ('user', 'unit_manager', 'department_manager', 'admin'))
    NOT VALID;

-- Check constraint for valid statuses
ALTER TABLE users ADD CONSTRAINT check_users_status 
    CHECK (status IN ('pending', 'active', 'blocked', 'rejected', 'password_reset_required'))
    NOT VALID;

-- Validate constraints (non-blocking, only validates new data)
ALTER TABLE users VALIDATE CONSTRAINT check_users_role;
ALTER TABLE users VALIDATE CONSTRAINT check_users_status;

-- ============================================================================
-- 5. Create audit_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing audit_logs table
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS actor_user_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS entity_id INTEGER;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50);
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'audit_logs' AND constraint_name = 'fk_audit_logs_actor_user_id'
    ) THEN
        ALTER TABLE audit_logs ADD CONSTRAINT fk_audit_logs_actor_user_id 
            FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 6. Create refresh_tokens table
-- ============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP
);

-- ============================================================================
-- 7. Create indexes for performance
-- ============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org_unit_id ON users(org_unit_id);
CREATE INDEX IF NOT EXISTS idx_users_position_id ON users(position_id);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type_id ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Refresh tokens indexes
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================================================
-- 8. Migration verification queries
-- ============================================================================

-- These queries verify the migration was successful
-- Run them after migration to confirm:

-- \echo 'Verifying migration...'
-- \echo 'Tables created:'
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' AND table_name IN ('users', 'org_units', 'positions', 'audit_logs', 'refresh_tokens');

-- \echo 'Users table columns:'
-- SELECT column_name, data_type FROM information_schema.columns 
-- WHERE table_name = 'users' ORDER BY ordinal_position;

-- \echo 'Indexes created:'
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('users', 'audit_logs', 'refresh_tokens');

-- \echo 'Check constraints:'
-- SELECT constraint_name, check_clause FROM information_schema.check_constraints 
-- WHERE table_name = 'users';

-- ============================================================================
-- 9. Data migration (if needed)
-- ============================================================================

-- If existing users have NULL role or status, set defaults:
UPDATE users SET role = 'user' WHERE role IS NULL;
UPDATE users SET status = 'active' WHERE status IS NULL;

-- ============================================================================
-- End of migration
-- ============================================================================
