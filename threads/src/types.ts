/**
 * Fluxer Threads - Types
 */

export type ThreadState = 'active' | 'closed' | 'archived' | 'deleted';

export interface ThreadMember {
  threadId: string;
  userId: string;
  joinedAt: number; // epoch ms
  lastReadTimestamp?: number;
  notificationLevel?: 'all' | 'mentions' | 'muted';
}

export interface Thread {
  id: string;
  channelId: string; // parent channel ID
  communityId?: string | null;
  parentMessageId?: string | null;
  name: string;
  creatorId: string;
  creatorUsername: string;
  state: ThreadState;
  createdAt: number;
  autoArchiveDurationMinutes: number; // e.g. 10080 (7d), 4320 (3d), 1440 (1d), 60 (1h)
  archivedAt?: number | null;
  archivedBy?: string | null;
  lastMessageTimestamp?: number | null;
  lastMessageSenderId?: string | null;
  lastMessageSenderUsername?: string | null;
  messageCount: number;
  memberCount: number;
}

export interface CreateThreadInput {
  channelId: string;
  parentMessageId?: string | null;
  name: string;
  creatorId: string;
  creatorUsername: string;
  autoArchiveDurationMinutes?: number; // defaults to 10080 (7 days)
}
