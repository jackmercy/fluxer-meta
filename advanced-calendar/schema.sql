-- ==========================================================
-- Fluxer Advanced Calendar & Voice Channel Extensions (Bounty #22)
-- PostgreSQL Schema
-- ==========================================================

-- 1. Voice Channel Join-By-Link Invitations
CREATE TABLE IF NOT EXISTS vc_join_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id VARCHAR(64) NOT NULL,
    guild_id VARCHAR(64) NOT NULL,
    creator_id VARCHAR(64) NOT NULL,
    token VARCHAR(64) NOT NULL UNIQUE,
    event_id VARCHAR(64) REFERENCES scheduled_events(id) ON DELETE SET NULL,
    max_uses INT DEFAULT NULL,
    current_uses INT DEFAULT 0,
    allow_guests BOOLEAN DEFAULT TRUE,
    is_revoked BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vc_join_links_token ON vc_join_links(token);
CREATE INDEX IF NOT EXISTS idx_vc_join_links_channel ON vc_join_links(channel_id);
CREATE INDEX IF NOT EXISTS idx_vc_join_links_event ON vc_join_links(event_id);

-- 2. Temporary / Ephemeral Guest Accounts
CREATE TABLE IF NOT EXISTS temporary_accounts (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    session_token VARCHAR(128) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    channel_id VARCHAR(64) NOT NULL,
    is_temporary BOOLEAN DEFAULT TRUE,
    converted_to_user_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_temp_accounts_session ON temporary_accounts(session_token);
CREATE INDEX IF NOT EXISTS idx_temp_accounts_expires ON temporary_accounts(expires_at);

-- 3. Password Protected Voice Channels & Events
CREATE TABLE IF NOT EXISTS vc_password_configs (
    channel_id VARCHAR(64) PRIMARY KEY,
    password_hash VARCHAR(256) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    algorithm VARCHAR(32) DEFAULT 'sha256',
    hint VARCHAR(256),
    max_attempts INT DEFAULT 5,
    lockout_duration_seconds INT DEFAULT 300,
    is_locked BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Rate Limiting / Lockout Tracking
CREATE TABLE IF NOT EXISTS vc_password_attempts (
    id BIGSERIAL PRIMARY KEY,
    channel_id VARCHAR(64) NOT NULL,
    client_identifier VARCHAR(128) NOT NULL, -- IP or Session ID
    attempts_count INT DEFAULT 1,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    last_attempt_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_channel_client UNIQUE (channel_id, client_identifier)
);

CREATE INDEX IF NOT EXISTS idx_password_attempts_lookup 
ON vc_password_attempts(channel_id, client_identifier);
