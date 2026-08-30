/**
 * Core Thread Lifecycle Manager
 */

import { Thread, ThreadMember, ThreadState, CreateThreadInput } from './types';

export class ThreadManager {
  private threads: Map<string, Thread> = new Map();
  private members: Map<string, Set<string>> = new Map(); // threadId -> Set<userId>

  createThread(input: CreateThreadInput): Thread {
    const threadId = `th_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = Date.now();

    const thread: Thread = {
      id: threadId,
      channelId: input.channelId,
      parentMessageId: input.parentMessageId || null,
      name: input.name,
      creatorId: input.creatorId,
      creatorUsername: input.creatorUsername,
      state: 'active',
      createdAt: now,
      autoArchiveDurationMinutes: input.autoArchiveDurationMinutes || 10080,
      messageCount: input.parentMessageId ? 1 : 0,
      memberCount: 1,
      lastMessageTimestamp: now,
    };

    this.threads.set(threadId, thread);
    this.members.set(threadId, new Set([input.creatorId]));
    return thread;
  }

  getThread(threadId: string): Thread | null {
    return this.threads.get(threadId) || null;
  }

  joinThread(threadId: string, userId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state === 'deleted') return false;

    const set = this.members.get(threadId) || new Set();
    if (!set.has(userId)) {
      set.add(userId);
      this.members.set(threadId, set);
      thread.memberCount = set.size;
      return true;
    }
    return false;
  }

  leaveThread(threadId: string, userId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread) return false;

    const set = this.members.get(threadId);
    if (set && set.has(userId)) {
      set.delete(userId);
      thread.memberCount = set.size;
      return true;
    }
    return false;
  }

  closeThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== 'active') return false;
    thread.state = 'closed';
    return true;
  }

  reopenThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== 'closed') return false;
    thread.state = 'active';
    return true;
  }

  archiveThread(threadId: string, operatorId?: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state === 'deleted') return false;
    thread.state = 'archived';
    thread.archivedAt = Date.now();
    thread.archivedBy = operatorId || null;
    return true;
  }

  unarchiveThread(threadId: string): boolean {
    const thread = this.threads.get(threadId);
    if (!thread || thread.state !== 'archived') return false;
    thread.state = 'active';
    thread.archivedAt = null;
    thread.archivedBy = null;
    return true;
  }

  listThreadsInChannel(channelId: string): Thread[] {
    return Array.from(this.threads.values()).filter(
      (t) => t.channelId === channelId && t.state !== 'deleted'
    );
  }
}
