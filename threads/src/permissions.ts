/**
 * Thread Permissions Inheritance Engine
 */

export interface ChannelPermissions {
  canViewChannel: boolean;
  canSendMessages: boolean;
  canCreateThreads: boolean;
  canManageThreads: boolean; // close, open, archive, delete
  isModerator: boolean;
}

export class ThreadPermissions {
  static canCreateThread(perms: ChannelPermissions): boolean {
    return perms.canViewChannel && perms.canSendMessages && (perms.canCreateThreads || perms.isModerator);
  }

  static canSendInThread(perms: ChannelPermissions, threadState: string): boolean {
    if (!perms.canViewChannel) return false;
    if (threadState === 'archived' && !perms.canManageThreads) return false;
    if (threadState === 'deleted') return false;
    return perms.canSendMessages;
  }

  static canManageThread(perms: ChannelPermissions, threadCreatorId: string, currentUserId: string): boolean {
    if (perms.isModerator || perms.canManageThreads) return true;
    return threadCreatorId === currentUserId;
  }
}
