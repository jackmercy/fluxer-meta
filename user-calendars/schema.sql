-- ==========================================================
-- Fluxer User Calendars & iCal Synchronization (Bounty #21)
-- PostgreSQL Schema
-- ==========================================================

-- 1. User Event Subscriptions & RSVP Tracking
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_id VARCHAR(64) NOT NULL REFERENCES scheduled_events(id) ON DELETE CASCADE,
    guild_id VARCHAR(64) NOT NULL REFERENCES guilds(id) ON DELETE CASCADE,
    status VARCHAR(32) NOT NULL DEFAULT 'GOING' CHECK (status IN ('GOING', 'MAYBE', 'INTERESTED', 'NOT_GOING')),
    reminder_minutes INT[] DEFAULT ARRAY[15, 60], -- Reminders 15m and 60m before
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_event_subscription UNIQUE (user_id, event_id)
);

CREATE INDEX IF NOT EXISTS idx_event_subscriptions_user ON event_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_event ON event_subscriptions(event_id);
CREATE INDEX IF NOT EXISTS idx_event_subscriptions_status ON event_subscriptions(status);

-- 2. Webcal / External iCal Feed Tokens
CREATE TABLE IF NOT EXISTS user_calendar_feed_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feed_tokens_user ON user_calendar_feed_tokens(user_id);
