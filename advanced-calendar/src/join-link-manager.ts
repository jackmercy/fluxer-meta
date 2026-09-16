import crypto from 'node:crypto';
import { JoinLink } from './types.ts';

export interface CreateJoinLinkOptions {
  channelId: string;
  guildId: string;
  creatorId: string;
  expiresInMs?: number;
  maxUses?: number;
  eventId?: string;
  allowGuests?: boolean;
}

export class JoinLinkManager {
  private links: Map<string, JoinLink> = new Map(); // token -> JoinLink

  /**
   * Generates a new join-by-link token for a voice channel or event.
   */
  public createLink(options: CreateJoinLinkOptions): JoinLink {
    const token = crypto.randomBytes(16).toString('hex');
    const now = Date.now();
    const expiresAt = options.expiresInMs ? now + options.expiresInMs : null;

    const link: JoinLink = {
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

  /**
   * Resolves and validates a join link by its token.
   */
  public validateLink(token: string): { valid: boolean; link?: JoinLink; reason?: string } {
    const link = this.links.get(token);
    if (!link) {
      return { valid: false, reason: 'LINK_NOT_FOUND' };
    }

    if (link.isRevoked) {
      return { valid: false, link, reason: 'LINK_REVOKED' };
    }

    if (link.expiresAt !== null && Date.now() > link.expiresAt) {
      return { valid: false, link, reason: 'LINK_EXPIRED' };
    }

    if (link.maxUses !== null && link.currentUses >= link.maxUses) {
      return { valid: false, link, reason: 'LINK_MAX_USES_REACHED' };
    }

    return { valid: true, link };
  }

  /**
   * Increments the usage count of a link upon successful join.
   */
  public recordUsage(token: string): boolean {
    const check = this.validateLink(token);
    if (!check.valid || !check.link) {
      return false;
    }
    check.link.currentUses += 1;
    return true;
  }

  /**
   * Revokes an existing join link.
   */
  public revokeLink(token: string, requestingUserId: string): boolean {
    const link = this.links.get(token);
    if (!link) return false;
    // Only creator or admin can revoke
    if (link.creatorId !== requestingUserId) {
      return false;
    }
    link.isRevoked = true;
    return true;
  }

  /**
   * Returns all active links for a specific channel or event.
   */
  public getLinksForChannel(channelId: string): JoinLink[] {
    return Array.from(this.links.values()).filter(
      (l) => l.channelId === channelId && !l.isRevoked && (l.expiresAt === null || l.expiresAt > Date.now())
    );
  }
}
