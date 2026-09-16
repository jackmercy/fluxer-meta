/**
 * Type definitions for Fluxer User Calendars:
 * Subscriptions, RSVPs, and RFC 5545 iCalendar Exports (Bounty #21).
 */

export type SubscriptionStatus = 'GOING' | 'MAYBE' | 'INTERESTED' | 'NOT_GOING';

export interface EventSubscription {
  id: string;
  userId: string;
  eventId: string;
  guildId: string;
  status: SubscriptionStatus;
  reminderMinutesBefore: number[]; // e.g. [15, 60] -> 15 min and 1 hr before
  createdAt: number;
  updatedAt: number;
}

export interface ScheduledEvent {
  id: string;
  guildId: string;
  channelId?: string;
  name: string;
  description?: string;
  startTime: number; // Unix timestamp in ms
  endTime?: number;   // Unix timestamp in ms
  location?: string;  // e.g. "General Voice", "Room 4", or URL
  url?: string;       // Deep-link to the event or voice channel
  organizerId: string;
  status?: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
}

export interface UserCalendarFeedToken {
  userId: string;
  token: string;
  isRevoked: boolean;
  createdAt: number;
}

export interface ICalExportOptions {
  calendarName?: string;
  includeAlarms?: boolean;
  publishedTtlMinutes?: number;
}
