import crypto from 'node:crypto';
import {
  EventSubscription,
  ScheduledEvent,
  SubscriptionStatus,
  UserCalendarFeedToken,
} from './types.js';

export class SubscriptionManager {
  // Key: `${userId}:${eventId}` -> EventSubscription
  private subscriptions: Map<string, EventSubscription> = new Map();
  // Key: eventId -> ScheduledEvent
  private events: Map<string, ScheduledEvent> = new Map();
  // Key: token -> UserCalendarFeedToken
  private feedTokens: Map<string, UserCalendarFeedToken> = new Map();

  /**
   * Registers a scheduled event in the calendar engine.
   */
  public registerEvent(event: ScheduledEvent): void {
    this.events.set(event.id, event);
  }

  public getEvent(eventId: string): ScheduledEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * Subscribes a user to an event with a specific RSVP status and reminder preferences.
   */
  public subscribe(
    userId: string,
    eventId: string,
    status: SubscriptionStatus = 'GOING',
    reminderMinutesBefore: number[] = [15, 60]
  ): EventSubscription {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event with ID '${eventId}' not found.`);
    }

    const key = `${userId}:${eventId}`;
    const now = Date.now();
    const existing = this.subscriptions.get(key);

    const subscription: EventSubscription = {
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

  /**
   * Unsubscribes a user from an event.
   */
  public unsubscribe(userId: string, eventId: string): boolean {
    const key = `${userId}:${eventId}`;
    return this.subscriptions.delete(key);
  }

  /**
   * Retrieves all event subscriptions for a user.
   */
  public getUserSubscriptions(userId: string): EventSubscription[] {
    return Array.from(this.subscriptions.values()).filter((s) => s.userId === userId);
  }

  /**
   * Retrieves all scheduled events a user is currently subscribed to (GOING or MAYBE).
   */
  public getUserEvents(userId: string): ScheduledEvent[] {
    const subs = this.getUserSubscriptions(userId).filter(
      (s) => s.status === 'GOING' || s.status === 'MAYBE' || s.status === 'INTERESTED'
    );
    const events: ScheduledEvent[] = [];
    for (const sub of subs) {
      const event = this.events.get(sub.eventId);
      if (event) events.push(event);
    }
    return events;
  }

  /**
   * Issues a secure token for Webcal / iCalendar feed subscriptions.
   */
  public createFeedToken(userId: string): string {
    const token = crypto.randomBytes(24).toString('hex');
    this.feedTokens.set(token, {
      userId,
      token,
      isRevoked: false,
      createdAt: Date.now(),
    });
    return token;
  }

  /**
   * Validates a Webcal feed token and returns the corresponding userId.
   */
  public validateFeedToken(token: string): { valid: boolean; userId?: string } {
    const record = this.feedTokens.get(token);
    if (!record || record.isRevoked) {
      return { valid: false };
    }
    return { valid: true, userId: record.userId };
  }

  /**
   * Revokes a Webcal feed token.
   */
  public revokeFeedToken(token: string): boolean {
    const record = this.feedTokens.get(token);
    if (!record) return false;
    record.isRevoked = true;
    return true;
  }
}
