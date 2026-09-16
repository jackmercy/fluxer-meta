-- ==========================================================
-- Fluxer Community Events & Instance Safety (Bounties #19 & #20)
-- PostgreSQL Schema
-- ==========================================================

-- 1. Community Scheduled Events
CREATE TABLE IF NOT EXISTS community_scheduled_events (
    id VARCHAR(64) PRIMARY KEY,
    guild_id VARCHAR(64) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    channel_id VARCHAR(64) REFERENCES channels(id) ON DELETE SET NULL,
    name VARCHAR(256) NOT NULL,
    description TEXT,
    banner_media_id VARCHAR(64),
    banner_url TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    location VARCHAR(256),
    organizer_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED' 
        CHECK (status IN ('SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELED', 'FROZEN_BY_ADMIN')),
    is_frozen BOOLEAN DEFAULT FALSE,
    freeze_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comm_events_guild_start 
ON community_scheduled_events(guild_id, start_time);
CREATE INDEX IF NOT EXISTS idx_comm_events_status 
ON community_scheduled_events(status);

-- 2. Event Media Uploads & Tracking
CREATE TABLE IF NOT EXISTS event_media_uploads (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) REFERENCES community_scheduled_events(id) ON DELETE SET NULL,
    uploader_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guild_id VARCHAR(64) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    original_filename VARCHAR(256) NOT NULL,
    mime_type VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    sha256 CHAR(64) NOT NULL,
    phash VARCHAR(64) NOT NULL,
    safety_status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (safety_status IN ('PENDING', 'APPROVED', 'QUARANTINED', 'REJECTED')),
    quarantine_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_media_sha256 ON event_media_uploads(sha256);
CREATE INDEX IF NOT EXISTS idx_media_phash ON event_media_uploads(phash);
CREATE INDEX IF NOT EXISTS idx_media_safety_status ON event_media_uploads(safety_status);

-- 3. Instance Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_event_audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    admin_id VARCHAR(64) NOT NULL,
    event_id VARCHAR(64) REFERENCES community_scheduled_events(id) ON DELETE SET NULL,
    media_id VARCHAR(64) REFERENCES event_media_uploads(id) ON DELETE SET NULL,
    action VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_event ON admin_event_audit_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_event_audit_logs(admin_id);

-- 4. Known CSAM / Prohibited Signature Registry
CREATE TABLE IF NOT EXISTS known_csam_signatures (
    phash VARCHAR(64) PRIMARY KEY,
    threat_category VARCHAR(64) NOT NULL,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
