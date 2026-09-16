import crypto from 'node:crypto';
import {
  CommunityEvent,
  CreateEventInput,
  EventPermission,
  EventStatus,
  UpdateEventInput,
} from './types.ts';

export interface EventFilterOptions {
  status?: EventStatus;
  searchQuery?: string;
  fromTime?: number;
  toTime?: number;
}

export class CommunityEventManager {
  private events: Map<string, CommunityEvent> = new Map(); // eventId -> CommunityEvent

  /**
   * Checks whether a bitmask permission contains a required permission flag.
   */
  public static hasPermission(userPermissions: number, required: EventPermission): boolean {
    if ((userPermissions & EventPermission.ADMIN_OVERRIDE) === EventPermission.ADMIN_OVERRIDE) {
      return true;
    }
    return (userPermissions & required) === required;
  }

  /**
   * Creates a new community scheduled event.
   */
  public createEvent(input: CreateEventInput, actorPermissions: number): CommunityEvent {
    if (!CommunityEventManager.hasPermission(actorPermissions, EventPermission.CREATE_EVENTS)) {
      throw new Error('PERMISSION_DENIED: Missing CREATE_EVENTS permission.');
    }

    if (input.endTime && input.endTime <= input.startTime) {
      throw new Error('VALIDATION_ERROR: End time must be after start time.');
    }

    const now = Date.now();
    const eventId = `evt_${crypto.randomBytes(8).toString('hex')}`;

    const event: CommunityEvent = {
      id: eventId,
      guildId: input.guildId,
      channelId: input.channelId,
      name: input.name.trim(),
      description: input.description?.trim(),
      bannerMediaId: input.bannerMediaId,
      bannerUrl: input.bannerUrl,
      startTime: input.startTime,
      endTime: input.endTime,
      location: input.location?.trim(),
      organizerId: input.organizerId,
      status: 'SCHEDULED',
      isFrozen: false,
      createdAt: now,
      updatedAt: now,
    };

    this.events.set(eventId, event);
    return event;
  }

  /**
   * Updates an existing community event.
   */
  public updateEvent(
    eventId: string,
    updates: UpdateEventInput,
    actorId: string,
    actorPermissions: number
  ): CommunityEvent {
    const event = this.events.get(eventId);
    if (!event) {
      throw new Error(`Event with ID '${eventId}' not found.`);
    }

    if (event.isFrozen && !CommunityEventManager.hasPermission(actorPermissions, EventPermission.ADMIN_OVERRIDE)) {
      throw new Error('EVENT_FROZEN: Event is frozen by instance administration.');
    }

    const isOrganizer = event.organizerId === actorId;
    const canManage = CommunityEventManager.hasPermission(actorPermissions, EventPermission.MANAGE_EVENTS);

    if (!isOrganizer && !canManage) {
      throw new Error('PERMISSION_DENIED: Cannot manage this event.');
    }

    if (updates.startTime !== undefined) event.startTime = updates.startTime;
    if (updates.endTime !== undefined) event.endTime = updates.endTime;
    if (updates.name !== undefined) event.name = updates.name.trim();
    if (updates.description !== undefined) event.description = updates.description.trim();
    if (updates.channelId !== undefined) event.channelId = updates.channelId;
    if (updates.bannerMediaId !== undefined) event.bannerMediaId = updates.bannerMediaId;
    if (updates.bannerUrl !== undefined) event.bannerUrl = updates.bannerUrl;
    if (updates.location !== undefined) event.location = updates.location.trim();
    if (updates.status !== undefined) event.status = updates.status;

    event.updatedAt = Date.now();
    return event;
  }

  /**
   * Cancels an event.
   */
  public cancelEvent(eventId: string, actorId: string, actorPermissions: number): CommunityEvent {
    return this.updateEvent(eventId, { status: 'CANCELED' }, actorId, actorPermissions);
  }

  /**
   * Deletes an event permanently.
   */
  public deleteEvent(eventId: string, actorId: string, actorPermissions: number): boolean {
    const event = this.events.get(eventId);
    if (!event) return false;

    const isOrganizer = event.organizerId === actorId;
    const canManage = CommunityEventManager.hasPermission(actorPermissions, EventPermission.MANAGE_EVENTS);

    if (!isOrganizer && !canManage) {
      throw new Error('PERMISSION_DENIED: Cannot delete this event.');
    }

    return this.events.delete(eventId);
  }

  public getEvent(eventId: string): CommunityEvent | undefined {
    return this.events.get(eventId);
  }

  /**
   * Lists and filters events for a community (Visual Events Page feed).
   */
  public listEventsForGuild(guildId: string, options: EventFilterOptions = {}): CommunityEvent[] {
    let list = Array.from(this.events.values()).filter((e) => e.guildId === guildId);

    if (options.status) {
      list = list.filter((e) => e.status === options.status);
    }

    if (options.fromTime) {
      list = list.filter((e) => e.startTime >= options.fromTime!);
    }

    if (options.toTime) {
      list = list.filter((e) => e.startTime <= options.toTime!);
    }

    if (options.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      list = list.filter((e) => e.name.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q));
    }

    // Sort chronologically
    return list.sort((a, b) => a.startTime - b.startTime);
  }
}
