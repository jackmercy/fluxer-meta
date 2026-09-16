import crypto from 'node:crypto';
import { PasswordAttemptState, VCPasswordConfig } from './types.ts';

export interface SetPasswordOptions {
  channelId: string;
  password: string;
  hint?: string;
  maxAttempts?: number;
  lockoutDurationMs?: number;
}

export class VCPasswordService {
  private configs: Map<string, VCPasswordConfig> = new Map(); // channelId -> VCPasswordConfig
  // Key: `${channelId}:${identifier}` -> attempt tracking
  private attempts: Map<string, PasswordAttemptState> = new Map();
  // Key: `${channelId}:${userIdOrSession}` -> unlock grant expiration timestamp
  private unlockGrants: Map<string, number> = new Map();

  /**
   * Hashes a password using SHA-256 and a secure random salt.
   */
  private hashPassword(password: string, salt: string): string {
    return crypto.createHash('sha256').update(`${salt}:${password}`).digest('hex');
  }

  /**
   * Configures a password for a voice channel.
   */
  public setPassword(options: SetPasswordOptions): VCPasswordConfig {
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = this.hashPassword(options.password, salt);

    const config: VCPasswordConfig = {
      channelId: options.channelId,
      passwordHash,
      salt,
      algorithm: 'sha256',
      hint: options.hint,
      maxAttempts: options.maxAttempts ?? 5,
      lockoutDurationMs: options.lockoutDurationMs ?? 5 * 60 * 1000, // 5 min
      isLocked: true,
      updatedAt: Date.now(),
    };

    this.configs.set(options.channelId, config);
    return config;
  }

  /**
   * Checks if a channel requires a password.
   */
  public hasPassword(channelId: string): boolean {
    const config = this.configs.get(channelId);
    return Boolean(config && config.isLocked);
  }

  public getHint(channelId: string): string | undefined {
    return this.configs.get(channelId)?.hint;
  }

  /**
   * Checks whether a user already has an active unlock grant.
   */
  public hasActiveUnlock(channelId: string, userIdentifier: string): boolean {
    const grantKey = `${channelId}:${userIdentifier}`;
    const expiresAt = this.unlockGrants.get(grantKey);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
      this.unlockGrants.delete(grantKey);
      return false;
    }
    return true;
  }

  /**
   * Verifies a password attempt with brute-force lockout protection.
   */
  public verifyPassword(
    channelId: string,
    attemptPassword: string,
    clientIdentifier: string,
    grantTtlMs: number = 60 * 60 * 1000 // 1 hour grant
  ): { success: boolean; error?: string; lockoutRemainingMs?: number } {
    const config = this.configs.get(channelId);
    if (!config || !config.isLocked) {
      return { success: true };
    }

    const attemptKey = `${channelId}:${clientIdentifier}`;
    const now = Date.now();
    const state = this.attempts.get(attemptKey) || { attempts: 0, lockedUntil: null };

    // Check lockout
    if (state.lockedUntil && now < state.lockedUntil) {
      return {
        success: false,
        error: 'TOO_MANY_ATTEMPTS_LOCKED_OUT',
        lockoutRemainingMs: state.lockedUntil - now,
      };
    }

    // Hash input
    const inputHash = this.hashPassword(attemptPassword, config.salt);
    const isValid = crypto.timingSafeEqual(
      Buffer.from(inputHash, 'utf8'),
      Buffer.from(config.passwordHash, 'utf8')
    );

    if (isValid) {
      // Reset attempts
      this.attempts.delete(attemptKey);
      // Issue unlock grant
      const grantKey = `${channelId}:${clientIdentifier}`;
      this.unlockGrants.set(grantKey, now + grantTtlMs);
      return { success: true };
    }

    // Failed attempt
    state.attempts += 1;
    if (state.attempts >= config.maxAttempts) {
      state.lockedUntil = now + config.lockoutDurationMs;
      this.attempts.set(attemptKey, state);
      return {
        success: false,
        error: 'MAX_ATTEMPTS_EXCEEDED',
        lockoutRemainingMs: config.lockoutDurationMs,
      };
    }

    this.attempts.set(attemptKey, state);
    return {
      success: false,
      error: 'INCORRECT_PASSWORD',
    };
  }

  /**
   * Removes password protection from a channel.
   */
  public removePassword(channelId: string): boolean {
    return this.configs.delete(channelId);
  }
}
