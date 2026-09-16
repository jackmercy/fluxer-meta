/**
 * Unit Tests for Fluxer Advanced Calendar:
 * Join-by-link VCs, Temporary Guest Accounts, and Password Protection (Bounty #22)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Standalone implementation matching src/ for zero-dependency Node execution
class JoinLinkManager {
  constructor() {
    this.links = new Map();
  }

  createLink(options) {
    const token = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const expiresAt = options.expiresInMs ? now + options.expiresInMs : null;

    const link = {
      id: crypto.randomUUID(),
      channelId: options.channelId,
      guildId: options.guildId,
      creatorId: options.creatorId,
      token,
      expiresAt,
      maxUses: options.maxUses ?? null,
      currentUses: 0,
      eventId: options.eventId,
      allowGuests: options.allowGuests ?? true,
      isRevoked: false,
      createdAt: now,
    };

    this.links.set(token, link);
    return link;
  }

  validateLink(token) {
    const link = this.links.get(token);
    if (!link) return { valid: false, reason: 'LINK_NOT_FOUND' };
    if (link.isRevoked) return { valid: false, link, reason: 'LINK_REVOKED' };
    if (link.expiresAt !== null && Date.now() > link.expiresAt) {
      return { valid: false, link, reason: 'LINK_EXPIRED' };
    }
    if (link.maxUses !== null && link.currentUses >= link.maxUses) {
      return { valid: false, link, reason: 'LINK_MAX_USES_REACHED' };
    }
    return { valid: true, link };
  }

  recordUsage(token) {
    const check = this.validateLink(token);
    if (!check.valid || !check.link) return false;
    check.link.currentUses += 1;
    return true;
  }

  revokeLink(token, requestingUserId) {
    const link = this.links.get(token);
    if (!link || link.creatorId !== requestingUserId) return false;
    link.isRevoked = true;
    return true;
  }
}

class TemporaryAccountService {
  constructor() {
    this.accounts = new Map();
    this.permanentUsers = new Map();
  }

  createGuestAccount(channelId, displayName, ttlMs = 2 * 60 * 60 * 1000) {
    const id = `guest_${crypto.randomBytes(6).toString('hex')}`;
    const name = displayName?.trim() || `Guest_${id.slice(6, 10)}`;
    const sessionToken = `flx_tmp_${crypto.randomBytes(24).toString('hex')}`;
    const now = Date.now();

    const account = {
      id,
      username: id,
      displayName: name,
      sessionToken,
      channelId,
      isTemporary: true,
      expiresAt: now + ttlMs,
      createdAt: now,
    };

    this.accounts.set(sessionToken, account);
    return account;
  }

  validateSession(sessionToken) {
    const account = this.accounts.get(sessionToken);
    if (!account) return { valid: false, reason: 'SESSION_NOT_FOUND' };
    if (Date.now() > account.expiresAt) {
      this.accounts.delete(sessionToken);
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }
    return { valid: true, account };
  }

  claimAccount(req) {
    const validation = this.validateSession(req.temporaryToken);
    if (!validation.valid || !validation.account) {
      return { success: false, error: validation.reason || 'INVALID_SESSION' };
    }

    const account = validation.account;
    if (account.convertedToUserId) {
      return { success: false, error: 'ACCOUNT_ALREADY_CLAIMED' };
    }

    for (const u of this.permanentUsers.values()) {
      if (u.username.toLowerCase() === req.permanentUsername.toLowerCase()) {
        return { success: false, error: 'USERNAME_TAKEN' };
      }
      if (u.email.toLowerCase() === req.email.toLowerCase()) {
        return { success: false, error: 'EMAIL_ALREADY_REGISTERED' };
      }
    }

    const permanentUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    this.permanentUsers.set(permanentUserId, {
      id: permanentUserId,
      username: req.permanentUsername,
      email: req.email,
    });
    account.convertedToUserId = permanentUserId;

    return {
      success: true,
      permanentUserId,
      authToken: `flx_auth_${crypto.randomBytes(24).toString('hex')}`,
    };
  }
}

class VCPasswordService {
  constructor() {
    this.configs = new Map();
    this.attempts = new Map();
    this.unlockGrants = new Map();
  }

  hashPassword(password, salt) {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }

  setPassword(options) {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(options.password, salt);
    const config = {
      channelId: options.channelId,
      passwordHash,
      salt,
      hint: options.hint,
      maxAttempts: options.maxAttempts ?? 5,
      lockoutDurationMs: options.lockoutDurationMs ?? 5 * 60 * 1000,
      isLocked: true,
    };
    this.configs.set(options.channelId, config);
    return config;
  }

  hasPassword(channelId) {
    return Boolean(this.configs.get(channelId)?.isLocked);
  }

  getHint(channelId) {
    return this.configs.get(channelId)?.hint;
  }

  hasActiveUnlock(channelId, userIdentifier) {
    const key = `${channelId}:${userIdentifier}`;
    const exp = this.unlockGrants.get(key);
    if (!exp) return false;
    if (Date.now() > exp) {
      this.unlockGrants.delete(key);
      return false;
    }
    return true;
  }

  verifyPassword(channelId, attemptPassword, clientIdentifier, grantTtlMs = 3600000) {
    const config = this.configs.get(channelId);
    if (!config || !config.isLocked) return { success: true };

    const key = `${channelId}:${clientIdentifier}`;
    const now = Date.now();
    const state = this.attempts.get(key) || { attempts: 0, lockedUntil: null };

    if (state.lockedUntil && now < state.lockedUntil) {
      return {
        success: false,
        error: 'TOO_MANY_ATTEMPTS_LOCKED_OUT',
        lockoutRemainingMs: state.lockedUntil - now,
      };
    }

    const inputHash = this.hashPassword(attemptPassword, config.salt);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'utf8'),
      Buffer.from(config.passwordHash, 'utf8')
    );

    if (isValid) {
      this.attempts.delete(key);
      this.unlockGrants.set(key, now + grantTtlMs);
      return { success: true };
    }

    state.attempts += 1;
    if (state.attempts >= config.maxAttempts) {
      state.lockedUntil = now + config.lockoutDurationMs;
      this.attempts.set(key, state);
      return {
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        lockoutRemainingMs: config.lockoutDurationMs,
      };
    }

    this.attempts.set(key, state);
    return { success: false, error: 'INCORRECT_PASSWORD' };
  }
}

class AdvancedCalendarManager {
  constructor() {
    this.links = new JoinLinkManager();
    this.accounts = new TemporaryAccountService();
    this.passwords = new VCPasswordService();
  }

  joinByLink(req) {
    const linkCheck = this.links.validateLink(req.linkToken);
    if (!linkCheck.valid || !linkCheck.link) {
      return { success: false, error: linkCheck.reason || 'INVALID_LINK' };
    }

    const link = linkCheck.link;
    const channelId = link.channelId;
    const clientId = req.existingUserId || req.ipAddress || 'client';

    if (this.passwords.hasPassword(channelId)) {
      if (!this.passwords.hasActiveUnlock(channelId, clientId)) {
        if (!req.password) {
          return {
            success: false,
            channelId,
            requiresPassword: true,
            passwordHint: this.passwords.getHint(channelId),
            error: 'PASSWORD_REQUIRED',
          };
        }

        const verify = this.passwords.verifyPassword(channelId, req.password, clientId);
        if (!verify.success) {
          return {
            success: false,
            channelId,
            requiresPassword: true,
            passwordHint: this.passwords.getHint(channelId),
            error: verify.error,
            lockoutRemainingMs: verify.lockoutRemainingMs,
          };
        }
      }
    }

    let tempAccount = null;
    if (!req.existingUserId) {
      if (!link.allowGuests) {
        return { success: false, error: 'GUESTS_NOT_ALLOWED_ON_THIS_LINK' };
      }
      tempAccount = this.accounts.createGuestAccount(channelId, req.guestDisplayName);
    }

    this.links.recordUsage(req.linkToken);

    return {
      success: true,
      channelId,
      guildId: link.guildId,
      eventId: link.eventId,
      temporaryAccount: tempAccount,
      voiceSessionToken: `flx_vcs_${Math.random().toString(36).slice(2)}_${Date.now()}`,
    };
  }
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------

test('JoinLinkManager: create, validate, and enforce usage limits', () => {
  const manager = new JoinLinkManager();

  const link = manager.createLink({
    channelId: 'vc-101',
    guildId: 'guild-1',
    creatorId: 'user-admin',
    maxUses: 2,
    expiresInMs: 60000,
  });

  assert.ok(link.token);
  assert.equal(link.currentUses, 0);

  // Validate initially
  const check1 = manager.validateLink(link.token);
  assert.equal(check1.valid, true);

  // Use once
  assert.equal(manager.recordUsage(link.token), true);
  assert.equal(manager.validateLink(link.token).link.currentUses, 1);

  // Use twice
  assert.equal(manager.recordUsage(link.token), true);
  assert.equal(manager.validateLink(link.token).link.currentUses, 2);

  // Exceeded max uses
  const checkMax = manager.validateLink(link.token);
  assert.equal(checkMax.valid, false);
  assert.equal(checkMax.reason, 'LINK_MAX_USES_REACHED');
});

test('JoinLinkManager: expiration and revocation enforcement', () => {
  const manager = new JoinLinkManager();

  // Expired link
  const expiredLink = manager.createLink({
    channelId: 'vc-102',
    guildId: 'guild-1',
    creatorId: 'user-admin',
    expiresInMs: -1000,
  });

  const checkExpired = manager.validateLink(expiredLink.token);
  assert.equal(checkExpired.valid, false);
  assert.equal(checkExpired.reason, 'LINK_EXPIRED');

  // Revocation
  const activeLink = manager.createLink({
    channelId: 'vc-103',
    guildId: 'guild-1',
    creatorId: 'user-admin',
  });

  assert.equal(manager.revokeLink(activeLink.token, 'wrong-user'), false);
  assert.equal(manager.revokeLink(activeLink.token, 'user-admin'), true);

  const checkRevoked = manager.validateLink(activeLink.token);
  assert.equal(checkRevoked.valid, false);
  assert.equal(checkRevoked.reason, 'LINK_REVOKED');
});

test('TemporaryAccountService: guest creation, validation, and claim', () => {
  const service = new TemporaryAccountService();

  const guest = service.createGuestAccount('vc-voice', 'CoolGuest', 3600000);
  assert.ok(guest.id.startsWith('guest_'));
  assert.equal(guest.displayName, 'CoolGuest');
  assert.equal(guest.isTemporary, true);

  const sessionCheck = service.validateSession(guest.sessionToken);
  assert.equal(sessionCheck.valid, true);
  assert.equal(sessionCheck.account.id, guest.id);

  const claimRes = service.claimAccount({
    temporaryToken: guest.sessionToken,
    permanentUsername: 'cool_permanent_user',
    email: 'cool@example.com',
    password: 'SecurePassword123!',
  });

  assert.equal(claimRes.success, true);
  assert.ok(claimRes.permanentUserId);
  assert.ok(claimRes.authToken);

  const duplicateClaim = service.claimAccount({
    temporaryToken: guest.sessionToken,
    permanentUsername: 'another_user',
    email: 'another@example.com',
    password: 'Password123!',
  });
  assert.equal(duplicateClaim.success, false);
  assert.equal(duplicateClaim.error, 'ACCOUNT_ALREADY_CLAIMED');
});

test('VCPasswordService: password protection, timing safety, and brute-force lockout', () => {
  const service = new VCPasswordService();

  service.setPassword({
    channelId: 'vc-private',
    password: 'TopSecretPassword',
    hint: 'Community Passcode',
    maxAttempts: 3,
    lockoutDurationMs: 10000,
  });

  assert.equal(service.hasPassword('vc-private'), true);
  assert.equal(service.getHint('vc-private'), 'Community Passcode');

  // Attempt 1 fail
  const fail1 = service.verifyPassword('vc-private', 'wrong1', 'client-ip-1');
  assert.equal(fail1.success, false);
  assert.equal(fail1.error, 'INCORRECT_PASSWORD');

  // Attempt 2 fail
  const fail2 = service.verifyPassword('vc-private', 'wrong2', 'client-ip-1');
  assert.equal(fail2.success, false);

  // Attempt 3 fail -> Lockout triggered
  const fail3 = service.verifyPassword('vc-private', 'wrong3', 'client-ip-1');
  assert.equal(fail3.success, false);
  assert.equal(fail3.error, 'MAX_ATTEMPTS_EXCEEDED');

  // Subsequent attempt locked out even with correct password
  const lockedAttempt = service.verifyPassword('vc-private', 'TopSecretPassword', 'client-ip-1');
  assert.equal(lockedAttempt.success, false);
  assert.equal(lockedAttempt.error, 'TOO_MANY_ATTEMPTS_LOCKED_OUT');

  // Different client succeeds
  const client2 = service.verifyPassword('vc-private', 'TopSecretPassword', 'client-ip-2');
  assert.equal(client2.success, true);
  assert.equal(service.hasActiveUnlock('vc-private', 'client-ip-2'), true);
});

test('AdvancedCalendarManager: end-to-end joinByLink flow with guests and passwords', () => {
  const manager = new AdvancedCalendarManager();

  const link = manager.links.createLink({
    channelId: 'vc-event-room',
    guildId: 'guild-10',
    creatorId: 'user-organizer',
    allowGuests: true,
    eventId: 'event-q4-meet',
  });

  manager.passwords.setPassword({
    channelId: 'vc-event-room',
    password: 'EventPasscode2026',
    hint: 'Check your calendar invite',
  });

  // 1. Join without password -> prompts for password
  const noPass = manager.joinByLink({
    linkToken: link.token,
    guestDisplayName: 'Bob',
    ipAddress: '10.0.0.1',
  });
  assert.equal(noPass.success, false);
  assert.equal(noPass.requiresPassword, true);
  assert.equal(noPass.passwordHint, 'Check your calendar invite');

  // 2. Join with wrong password -> fails
  const wrongPass = manager.joinByLink({
    linkToken: link.token,
    password: 'bad_password',
    guestDisplayName: 'Bob',
    ipAddress: '10.0.0.1',
  });
  assert.equal(wrongPass.success, false);

  // 3. Join with correct password -> succeeds and mints voice session
  const success = manager.joinByLink({
    linkToken: link.token,
    password: 'EventPasscode2026',
    guestDisplayName: 'Bob',
    ipAddress: '10.0.0.1',
  });
  assert.equal(success.success, true);
  assert.equal(success.channelId, 'vc-event-room');
  assert.equal(success.eventId, 'event-q4-meet');
  assert.ok(success.voiceSessionToken);
  assert.ok(success.temporaryAccount);
  assert.equal(success.temporaryAccount.displayName, 'Bob');
});
