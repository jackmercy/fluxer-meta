-- ============================================================================
-- Fluxer Polls Database Schema (PostgreSQL)
-- Supports Simple Polls, Multiple Selection, Ranked Choice, and Full Audit Logging
-- ============================================================================

CREATE TYPE poll_type_enum AS ENUM ('single_choice', 'multiple_choice', 'ranked_choice');
CREATE TYPE poll_status_enum AS ENUM ('active', 'closed', 'deleted');

-- 1. Main Polls Table
CREATE TABLE IF NOT EXISTS polls (
    id VARCHAR(64) PRIMARY KEY,
    message_id VARCHAR(64) NOT NULL UNIQUE,
    channel_id VARCHAR(64) NOT NULL,
    community_id VARCHAR(64),
    creator_id VARCHAR(64) NOT NULL,
    question TEXT NOT NULL,
    poll_type poll_type_enum NOT NULL DEFAULT 'single_choice',
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    allow_custom_responses BOOLEAN NOT NULL DEFAULT FALSE,
    max_custom_responses INT DEFAULT 10,
    max_ranked_choices INT DEFAULT 5,
    status poll_status_enum NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    closed_by VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_polls_channel ON polls (channel_id, status);
CREATE INDEX IF NOT EXISTS idx_polls_expiry ON polls (expires_at) WHERE status = 'active';

-- 2. Poll Options Table
CREATE TABLE IF NOT EXISTS poll_options (
    id VARCHAR(64) PRIMARY KEY,
    poll_id VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    image_url TEXT,
    image_thumbnail_url TEXT,
    order_index INT NOT NULL DEFAULT 0,
    creator_id VARCHAR(64) NOT NULL,
    is_custom BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options (poll_id, order_index);

-- 3. Poll Votes Table (Standard & Multi-Choice)
CREATE TABLE IF NOT EXISTS poll_votes (
    id BIGSERIAL PRIMARY KEY,
    poll_id VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    option_id VARCHAR(64) NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_poll_user_option UNIQUE (poll_id, user_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id, option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes (user_id);

-- 4. Ranked Choice Ballots Table
CREATE TABLE IF NOT EXISTS poll_ranked_ballots (
    id BIGSERIAL PRIMARY KEY,
    poll_id VARCHAR(64) NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL,
    option_id VARCHAR(64) NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
    rank_position INT NOT NULL CHECK (rank_position > 0),
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_ranked_ballot_pos UNIQUE (poll_id, user_id, rank_position)
);

CREATE INDEX IF NOT EXISTS idx_ranked_ballots_poll ON poll_ranked_ballots (poll_id, rank_position);

-- 5. Poll Audit Logs Table (Full Moderation Trail)
CREATE TABLE IF NOT EXISTS poll_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    poll_id VARCHAR(64) NOT NULL,
    channel_id VARCHAR(64) NOT NULL,
    community_id VARCHAR(64),
    actor_id VARCHAR(64) NOT NULL,
    actor_username VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    target_option_id VARCHAR(64),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_audit_logs_poll ON poll_audit_logs (poll_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poll_audit_logs_actor ON poll_audit_logs (actor_id);
