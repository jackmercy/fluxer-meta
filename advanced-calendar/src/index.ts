import { JoinLinkManager } from './join-link-manager.ts';
import { TemporaryAccountService } from './temporary-account-service.ts';
import { VCPasswordService } from './vc-password-service.ts';
import {
  JoinByLinkRequest,
  JoinByLinkResponse,
  TemporaryAccount,
  TemporaryAccountClaimRequest,
  TemporaryAccountClaimResponse,
} from './types.ts';

export * from './types.ts';
export { JoinLinkManager } from './join-link-manager.ts';
export { TemporaryAccountService } from './temporary-account-service.ts';
export { VCPasswordService } from './vc-password-service.ts';

export class AdvancedCalendarManager {
  public links: JoinLinkManager;
  public accounts: TemporaryAccountService;
  public passwords: VCPasswordService;

  constructor() {
    this.links = new JoinLinkManager();
    this.accounts = new TemporaryAccountService();
    this.passwords = new VCPasswordService();
  }

  /**
   * Complete flow for joining a voice channel via invite link,
   * handling guest account generation, password challenge, and session minting.
   */
  public joinByLink(req: JoinByLinkRequest): JoinByLinkResponse {
    // 1. Validate Link
    const linkCheck = this.links.validateLink(req.linkToken);
    if (!linkCheck.valid || !linkCheck.link) {
      return { success: false, error: linkCheck.reason || 'INVALID_LINK' };
    }

    const link = linkCheck.link;
    const channelId = link.channelId;
    const clientId = req.existingUserId || req.ipAddress || 'unknown-client';

    // 2. Check Password Protection
    if (this.passwords.hasPassword(channelId)) {
      const alreadyUnlocked = this.passwords.hasActiveUnlock(channelId, clientId);
      if (!alreadyUnlocked) {
        if (!req.password) {
          return {
            success: false,
            channelId,
            guildId: link.guildId,
            eventId: link.eventId,
            requiresPassword: true,
            passwordHint: this.passwords.getHint(channelId),
            error: 'PASSWORD_REQUIRED',
          };
        }

        const verifyResult = this.passwords.verifyPassword(channelId, req.password, clientId);
        if (!verifyResult.success) {
          return {
            success: false,
            channelId,
            requiresPassword: true,
            passwordHint: this.passwords.getHint(channelId),
            error: verifyResult.error,
            lockoutRemainingMs: verifyResult.lockoutRemainingMs,
          };
        }
      }
    }

    // 3. User Identity (Registered vs Temporary Guest)
    let tempAccount: TemporaryAccount | undefined;
    if (!req.existingUserId) {
      if (!link.allowGuests) {
        return { success: false, error: 'GUESTS_NOT_ALLOWED_ON_THIS_LINK' };
      }
      tempAccount = this.accounts.createGuestAccount(channelId, req.guestDisplayName);
    }

    // 4. Record usage
    this.links.recordUsage(req.linkToken);

    // 5. Mint Voice Session Token
    const voiceSessionToken = `flx_vcs_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    return {
      success: true,
      channelId,
      guildId: link.guildId,
      eventId: link.eventId,
      temporaryAccount: tempAccount,
      voiceSessionToken,
    };
  }

  /**
   * Convert a temporary guest account to a permanent registered account.
   */
  public claimTemporaryAccount(req: TemporaryAccountClaimRequest): TemporaryAccountClaimResponse {
    return this.accounts.claimAccount(req);
  }
}
