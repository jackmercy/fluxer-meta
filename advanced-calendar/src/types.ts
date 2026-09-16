/**
 * Type definitions for Advanced Calendar: Join-by-link VCs,
 * Temporary Guest Accounts, and Password Protected Voice Channels.
 * Matches Fluxer core architecture and Bounty #22 specification.
 */

export interface JoinLink {
  id: string;
  channelId: string;
  guildId: string;
  creatorId: string;
  token: string;
  expiresAt: number | null; // Unix timestamp in ms, null for no expiry
  maxUses: number | null;    // null for unlimited
  currentUses: number;
  eventId?: string;         // Associated scheduled calendar event
  allowGuests: boolean;
  isRevoked: boolean;
  createdAt: number;
}

export interface TemporaryAccount {
  id: string;
  username: string;
  displayName: string;
  sessionToken: string;
  ipAddress?: string;
  userAgent?: string;
  channelId: string;
  isTemporary: true;
  expiresAt: number;        // Auto-cleanup timestamp
  convertedToUserId?: string;
  createdAt: number;
}

export interface VCPasswordConfig {
  channelId: string;
  passwordHash: string;
  salt: string;
  algorithm: 'sha256' | 'argon2id';
  hint?: string;
  maxAttempts: number;
  lockoutDurationMs: number;
  isLocked: boolean;
  updatedAt: number;
}

export interface PasswordAttemptState {
  attempts: number;
  lockedUntil: number | null;
}

export interface JoinByLinkRequest {
  linkToken: string;
  password?: string;
  guestDisplayName?: string;
  existingUserId?: string;
  ipAddress?: string;
}

export interface JoinByLinkResponse {
  success: boolean;
  channelId?: string;
  guildId?: string;
  eventId?: string;
  temporaryAccount?: TemporaryAccount;
  voiceSessionToken?: string;
  requiresPassword?: boolean;
  passwordHint?: string;
  error?: string;
  lockoutRemainingMs?: number;
}

export interface TemporaryAccountClaimRequest {
  temporaryToken: string;
  email: string;
  password: string;
  permanentUsername: string;
}

export interface TemporaryAccountClaimResponse {
  success: boolean;
  permanentUserId?: string;
  authToken?: string;
  error?: string;
}
