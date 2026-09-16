import { SubscriptionManager } from './subscription-manager.js';
import { ICalGenerator } from './ical-generator.js';
import { ICalExportOptions, ScheduledEvent } from './types.js';

export * from './types.js';
export { SubscriptionManager } from './subscription-manager.js';
export { ICalGenerator } from './ical-generator.js';

export class UserCalendarService {
  public subscriptions: SubscriptionManager;

  constructor() {
    this.subscriptions = new SubscriptionManager();
  }

  /**
   * Exports a user's subscribed calendar to an RFC 5545 .ics string.
   */
  public exportUserCalendar(userId: string, options?: ICalExportOptions): string {
    const events = this.subscriptions.getUserEvents(userId);
    return ICalGenerator.generateCalendar(events, {
      calendarName: `Fluxer - User Calendar (${userId})`,
      ...options,
    });
  }

  /**
   * Exports a single event to an .ics string.
   */
  public exportEvent(eventId: string, options?: ICalExportOptions): string {
    const event = this.subscriptions.getEvent(eventId);
    if (!event) {
      throw new Error(`Event '${eventId}' not found.`);
    }
    return ICalGenerator.generateSingleEvent(event, options);
  }

  /**
   * Generates a live Webcal URL for user calendar subscriptions.
   */
  public getWebcalUrl(userId: string, domain: string = 'fluxer.app'): string {
    const token = this.subscriptions.createFeedToken(userId);
    return `webcal://${domain}/api/v1/users/${userId}/calendar.ics?token=${token}`;
  }
}
