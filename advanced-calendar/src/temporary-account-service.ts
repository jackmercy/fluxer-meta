import crypto from 'node:crypto';
import {
  TemporaryAccount,
  TemporaryAccountClaimRequest,
  TemporaryAccountClaimResponse,
} from './types.ts';

export class TemporaryAccountService {
  private accounts: Map<string, TemporaryAccount> = new Map(); // sessionToken -> TemporaryAccount
  private accountsById: Map<string, TemporaryAccount> = new Map(); // id -> TemporaryAccount
  private permanentUsers: Map<string, { id: string; username: string; email: string }> = new Map();

  /**
   * Creates an ephemeral guest account bound to a voice channel.
   */
  public createGuestAccount(
    channelId: string,
    displayName?: string,
    ttlMs: number = 2 * 60 * 60 * 1000 // 2 hours default
  ): TemporaryAccount {
    const id = `guest_${crypto.randomBytes(6).toString('hex')}`;
    const name = displayName?.trim() || `Guest_${id.slice(6, 10)}`;
    const sessionToken = `flx_tmp_${crypto.randomBytes(24).toString('hex')}`;
    const now = Date.now();

    const account: TemporaryAccount = {
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
    this.accountsById.set(id, account);
    return account;
  }

  /**
   * Validates a temporary session token and ensures it hasn't expired.
   */
  public validateSession(sessionToken: string): { valid: boolean; account?: TemporaryAccount; reason?: string } {
    const account = this.accounts.get(sessionToken);
    if (!account) {
      return { valid: false, reason: 'SESSION_NOT_FOUND' };
    }

    if (Date.now() > account.expiresAt) {
      this.cleanupAccount(account.sessionToken);
      return { valid: false, reason: 'SESSION_EXPIRED' };
    }

    return { valid: true, account };
  }

  /**
   * Converts a temporary account to a permanent registered account.
   */
  public claimAccount(request: TemporaryAccountClaimRequest): TemporaryAccountClaimResponse {
    const validation = this.validateSession(request.temporaryToken);
    if (!validation.valid || !validation.account) {
      return { success: false, error: validation.reason || 'INVALID_SESSION' };
    }

    const account = validation.account;
    if (account.convertedToUserId) {
      return { success: false, error: 'ACCOUNT_ALREADY_CLAIMED' };
    }

    // Check username uniqueness
    for (const u of this.permanentUsers.values()) {
      if (u.username.toLowerCase() === request.permanentUsername.toLowerCase()) {
        return { success: false, error: 'USERNAME_TAKEN' };
      }
      if (u.email.toLowerCase() === request.email.toLowerCase()) {
        return { success: false, error: 'EMAIL_ALREADY_REGISTERED' };
      }
    }

    const permanentUserId = `usr_${crypto.randomBytes(8).toString('hex')}`;
    const permanentUser = {
      id: permanentUserId,
      username: request.permanentUsername,
      email: request.email,
    };

    this.permanentUsers.set(permanentUserId, permanentUser);
    account.convertedToUserId = permanentUserId;

    // Issue permanent auth token
    const authToken = `flx_auth_${crypto.randomBytes(24).toString('hex')}`;

    return {
      success: true,
      permanentUserId,
      authToken,
    };
  }

  /**
   * Cleans up expired temporary accounts.
   */
  public purgeExpiredAccounts(): number {
    const now = Date.now();
    let purged = 0;
    for (const [token, acc] of this.accounts.entries()) {
      if (now > acc.expiresAt) {
        this.cleanupAccount(token);
        purged++;
      }
    }
    return purged;
  }

  /**
   * Deletes a temporary account immediately (e.g. on manual disconnect).
   */
  public cleanupAccount(sessionToken: string): boolean {
    const acc = this.accounts.get(sessionToken);
    if (!acc) return false;
    this.accounts.delete(sessionToken);
    this.accountsById.delete(acc.id);
    return true;
  }

  public getAccountById(id: string): TemporaryAccount | undefined {
    return this.accountsById.get(id);
  }
}
