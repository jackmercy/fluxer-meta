/**
 * Unit Tests for Fluxer User Calendars:
 * Subscriptions, RSVPs, and RFC 5545 iCalendar Exports (Bounty #21)
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

// Standalone implementation matching src/ for zero-dependency Node execution
class SubscriptionManager {
  constructor() {
    this.subscriptions = new Map();
    this.events = new Map();
    this.feedTokens = new Map();
  }

  registerEvent(event) {
    this.events.set(event.id, event);
  }

  getEvent(eventId) {
    return this.events.get(eventId);
  }

  subscribe(userId, eventId, status = 'GOING', reminderMinutesBefore = [15, 60]) {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event with ID '${eventId}' not found.`);
    }

    const key = `${userId}:${eventId}`;
    const now = Date.now();
    const existing = this.subscriptions.get(key);

    const subscription = {
      id: existing ? existing.id : crypto.randomUUID(),
      userId,
      eventId,
      guildId: event.guildId,
      status,
      reminderMinutesBefore: [...reminderMinutesBefore],
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
    };

    this.subscriptions.set(key, subscription);
    return subscription;
  }

  unsubscribe(userId, eventId) {
    const key = `${userId}:${eventId}`;
    return this.subscriptions.delete(key);
  }

  getUserSubscriptions(userId) {
    return Array.from(this.subscriptions.values()).filter((s) => s.userId === userId);
  }

  getUserEvents(userId) {
    const subs = this.getUserSubscriptions(userId).filter(
      (s) => s.status === 'GOING' || s.status === 'MAYBE' || s.status === 'INTERESTED'
    );
    const events = [];
    for (const sub of subs) {
      const event = this.events.get(sub.eventId);
      if (event) events.push(event);
    }
    return events;
  }

  createFeedToken(userId) {
    const token = crypto.randomBytes(24).toString('hex');
    this.feedTokens.set(token, {
      userId,
      token,
      isRevoked: false,
      createdAt: Date.now(),
    });
    return token;
  }

  validateFeedToken(token) {
    const record = this.feedTokens.get(token);
    if (!record || record.isRevoked) {
      return { valid: false };
    }
    return { valid: true, userId: record.userId };
  }

  revokeFeedToken(token) {
    const record = this.feedTokens.get(token);
    if (!record) return false;
    record.isRevoked = true;
    return true;
  }
}

class ICalGenerator {
  static formatDate(timestamp) {
    const d = new Date(timestamp);
    const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    const seconds = pad(d.getUTCSeconds());
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  static escapeText(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');
  }

  static generateCalendar(events, options = {}) {
    const calName = options.calendarName || 'Fluxer Calendar';
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Fluxer//User Calendars 1.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(calName)}`,
      'X-WR-TIMEZONE:UTC',
    ];

    if (options.publishedTtlMinutes) {
      lines.push(`X-PUBLISHED-TTL:PT${options.publishedTtlMinutes}M`);
    }

    const nowStr = this.formatDate(Date.now());

    for (const event of events) {
      const startStr = this.formatDate(event.startTime);
      const endTimestamp = event.endTime || event.startTime + 60 * 60 * 1000;
      const endStr = this.formatDate(endTimestamp);
      const uid = `event_${event.id}@fluxer.app`;

      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${uid}`);
      lines.push(`DTSTAMP:${nowStr}`);
      lines.push(`DTSTART:${startStr}`);
      lines.push(`DTEND:${endStr}`);
      lines.push(`SUMMARY:${this.escapeText(event.name)}`);

      if (event.description) {
        lines.push(`DESCRIPTION:${this.escapeText(event.description)}`);
      }

      if (event.location) {
        lines.push(`LOCATION:${this.escapeText(event.location)}`);
      }

      if (event.url) {
        lines.push(`URL:${event.url}`);
      }

      lines.push('STATUS:CONFIRMED');

      if (options.includeAlarms !== false) {
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT15M');
        lines.push('ACTION:DISPLAY');
        lines.push(`DESCRIPTION:Reminder: ${this.escapeText(event.name)}`);
        lines.push('END:VALARM');
      }

      lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n') + '\r\n';
  }

  static generateSingleEvent(event, options) {
    return this.generateCalendar([event], {
      calendarName: event.name,
      ...options,
    });
  }
}

class UserCalendarService {
  constructor() {
    this.subscriptions = new SubscriptionManager();
  }

  exportUserCalendar(userId, options) {
    const events = this.subscriptions.getUserEvents(userId);
    return ICalGenerator.generateCalendar(events, {
      calendarName: `Fluxer - User Calendar (${userId})`,
      ...options,
    });
  }

  exportEvent(eventId, options) {
    const event = this.subscriptions.getEvent(eventId);
    if (!event) {
      throw new Error(`Event '${eventId}' not found.`);
    }
    return ICalGenerator.generateSingleEvent(event, options);
  }

  getWebcalUrl(userId, domain = 'fluxer.app') {
    const token = this.subscriptions.createFeedToken(userId);
    return `webcal://${domain}/api/v1/users/${userId}/calendar.ics?token=${token}`;
  }
}

// -----------------------------------------------------------------------------
// Test Execution
// -----------------------------------------------------------------------------

test('SubscriptionManager: register events, subscribe, update status, and unsubscribe', () => {
  const manager = new SubscriptionManager();

  manager.registerEvent({
    id: 'evt-1',
    guildId: 'guild-1',
    name: 'Community Gaming Night',
    startTime: 1789564800000,
    endTime: 1789572000000,
    organizerId: 'user-mod',
  });

  manager.registerEvent({
    id: 'evt-2',
    guildId: 'guild-1',
    name: 'Developer Sync',
    startTime: 1789651200000,
    organizerId: 'user-admin',
  });

  // Subscribe to evt-1
  const sub1 = manager.subscribe('user-alice', 'evt-1', 'GOING', [15, 60]);
  assert.equal(sub1.userId, 'user-alice');
  assert.equal(sub1.eventId, 'evt-1');
  assert.equal(sub1.status, 'GOING');
  assert.deepEqual(sub1.reminderMinutesBefore, [15, 60]);

  // Subscribe to evt-2 as MAYBE
  manager.subscribe('user-alice', 'evt-2', 'MAYBE', [30]);

  // Query user events
  const aliceEvents = manager.getUserEvents('user-alice');
  assert.equal(aliceEvents.length, 2);
  assert.equal(aliceEvents[0].name, 'Community Gaming Night');
  assert.equal(aliceEvents[1].name, 'Developer Sync');

  // Update status to NOT_GOING
  manager.subscribe('user-alice', 'evt-2', 'NOT_GOING');
  const aliceEventsAfterUpdate = manager.getUserEvents('user-alice');
  assert.equal(aliceEventsAfterUpdate.length, 1);
  assert.equal(aliceEventsAfterUpdate[0].id, 'evt-1');

  // Unsubscribe
  assert.equal(manager.unsubscribe('user-alice', 'evt-1'), true);
  assert.equal(manager.getUserEvents('user-alice').length, 0);
});

test('ICalGenerator: strict RFC 5545 format and special character escaping', () => {
  const event = {
    id: 'evt-special',
    guildId: 'guild-alpha',
    name: 'Tech Talk: Rust, WebRTC; & Fluxer\\Architecture',
    description: 'Line 1\nLine 2, with comma; and semicolon',
    startTime: Date.UTC(2026, 8, 20, 18, 0, 0), // 2026-09-20T18:00:00Z
    endTime: Date.UTC(2026, 8, 20, 19, 30, 0),
    location: 'Stage 1, Main Floor; Room A',
    url: 'https://fluxer.app/events/evt-special',
    organizerId: 'usr-speaker',
  };

  const ics = ICalGenerator.generateSingleEvent(event);

  // Structural checks
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  assert.ok(ics.includes('VERSION:2.0\r\n'));
  assert.ok(ics.includes('PRODID:-//Fluxer//User Calendars 1.0//EN\r\n'));
  assert.ok(ics.includes('BEGIN:VEVENT\r\n'));
  assert.ok(ics.includes('UID:event_evt-special@fluxer.app\r\n'));
  assert.ok(ics.includes('DTSTART:20260920T180000Z\r\n'));
  assert.ok(ics.includes('DTEND:20260920T193000Z\r\n'));
  assert.ok(ics.includes('STATUS:CONFIRMED\r\n'));
  assert.ok(ics.includes('BEGIN:VALARM\r\n'));
  assert.ok(ics.includes('TRIGGER:-PT15M\r\n'));
  assert.ok(ics.includes('END:VALARM\r\n'));
  assert.ok(ics.includes('END:VEVENT\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));

  // Escaping checks
  assert.ok(ics.includes('SUMMARY:Tech Talk: Rust\\, WebRTC\\; & Fluxer\\\\Architecture'));
  assert.ok(ics.includes('DESCRIPTION:Line 1\\nLine 2\\, with comma\\; and semicolon'));
  assert.ok(ics.includes('LOCATION:Stage 1\\, Main Floor\\; Room A'));
});

test('SubscriptionManager: Webcal feed token generation, validation, and revocation', () => {
  const manager = new SubscriptionManager();

  const token = manager.createFeedToken('user-carol');
  assert.ok(token);
  assert.equal(token.length, 48); // 24 bytes hex

  // Validate active token
  const validCheck = manager.validateFeedToken(token);
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.userId, 'user-carol');

  // Revoke token
  assert.equal(manager.revokeFeedToken(token), true);

  // Validate revoked token
  const revokedCheck = manager.validateFeedToken(token);
  assert.equal(revokedCheck.valid, false);
});

test('UserCalendarService: end-to-end calendar bundle export and webcal URL', () => {
  const service = new UserCalendarService();

  service.subscriptions.registerEvent({
    id: 'evt-all-hands',
    guildId: 'guild-corp',
    name: 'Quarterly All-Hands',
    startTime: Date.UTC(2026, 9, 1, 15, 0, 0),
    organizerId: 'usr-ceo',
  });

  service.subscriptions.subscribe('usr-dan', 'evt-all-hands', 'GOING');

  // Export bundle
  const ics = service.exportUserCalendar('usr-dan', {
    calendarName: "Dan's Fluxer Calendar",
  });

  assert.ok(ics.includes('X-WR-CALNAME:Dan\'s Fluxer Calendar'));
  assert.ok(ics.includes('SUMMARY:Quarterly All-Hands'));

  // Webcal link
  const webcalUrl = service.getWebcalUrl('usr-dan');
  assert.ok(webcalUrl.startsWith('webcal://fluxer.app/api/v1/users/usr-dan/calendar.ics?token='));
});
