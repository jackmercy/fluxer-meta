/**
 * Unit Tests for Fluxer Threads
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

class SimpleThreadManager {
  constructor() {
    this.threads = new Map();
    this.members = new Map();
  }
  create(input) {
    const id = `th_${Date.now()}`;
    const thread = {
      id,
      channelId: input.channelId,
      name: input.name,
      creatorId: input.creatorId,
      state: 'active',
      memberCount: 1,
    };
    this.threads.set(id, thread);
    this.members.set(id, new Set([input.creatorId]));
    return thread;
  }
  join(id, userId) {
    const thread = this.threads.get(id);
    if (!thread) return false;
    const set = this.members.get(id);
    set.add(userId);
    thread.memberCount = set.size;
    return true;
  }
  close(id) {
    const thread = this.threads.get(id);
    if (!thread) return false;
    thread.state = 'closed';
    return true;
  }
  archive(id) {
    const thread = this.threads.get(id);
    if (!thread) return false;
    thread.state = 'archived';
    return true;
  }
}

test('Threads: Create thread and auto-join creator', () => {
  const manager = new SimpleThreadManager();
  const thread = manager.create({
    channelId: 'ch-general',
    name: 'Bug Discussion',
    creatorId: 'user-alice',
  });

  assert.equal(thread.name, 'Bug Discussion');
  assert.equal(thread.state, 'active');
  assert.equal(thread.memberCount, 1);
});

test('Threads: Multi-user join and state transitions', () => {
  const manager = new SimpleThreadManager();
  const thread = manager.create({
    channelId: 'ch-dev',
    name: 'Refactor RFC',
    creatorId: 'user-alice',
  });

  manager.join(thread.id, 'user-bob');
  manager.join(thread.id, 'user-charlie');
  assert.equal(thread.memberCount, 3);

  manager.close(thread.id);
  assert.equal(thread.state, 'closed');

  manager.archive(thread.id);
  assert.equal(thread.state, 'archived');
});
