/**
 * Type definitions for Fluxer Community Events & Instance Controls/Safety.
 * Fulfills Bounty #19 (Community Events) and Bounty #20 (Instance Controls & Safety Scanners).
 */

export enum EventPermission {
  VIEW_EVENTS = 1 << 0,
  CREATE_EVENTS = 1 << 1,
  MANAGE_EVENTS = 1 << 2,
  ADMIN_OVERRIDE = 1 << 3,
}

export type EventStatus =
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELED'
  | 'FROZEN_BY_ADMIN';

export type SafetyStatus = 'PENDING' | 'APPROVED' | 'QUARANTINED' | 'REJECTED';

export interface CommunityEvent {
  id: string;
  guildId: string;
  channelId?: string;
  name: string;
  description?: string;
  bannerUrl?: string;
  bannerMediaId?: string;
  startTime: number;
  endTime?: number;
  location?: string;
  organizerId: string;
  status: EventStatus;
  isFrozen: boolean;
  freezeReason?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateEventInput {
  guildId: string;
  channelId?: string;
  name: string;
  description?: string;
  bannerMediaId?: string;
  bannerUrl?: string;
  startTime: number;
  endTime?: number;
  location?: string;
  organizerId: string;
}

export interface UpdateEventInput {
  name?: string;
  description?: string;
  channelId?: string;
  bannerMediaId?: string;
  bannerUrl?: string;
  startTime?: number;
  endTime?: number;
  location?: string;
  status?: EventStatus;
}

export interface EventMediaUpload {
  id: string;
  eventId?: string;
  uploaderId: string;
  guildId: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  sha256: string;
  pHash: string;
  safetyStatus: SafetyStatus;
  quarantineReason?: string;
  createdAt: number;
}

export interface ImageSafetyScanResult {
  mediaId: string;
  isSafe: boolean;
  nsfwScore: number;       // 0.0 (clean) to 1.0 (unsafe)
  csamMatch: boolean;      // strict binary flag against known hash registries
  quarantineReason?: string;
  classification: 'CLEAN' | 'NSFW_SUSPECT' | 'CSAM_MATCH';
  pHash: string;
  scannedAt: number;
}

export interface AdminCalendarOverview {
  guildId: string;
  totalEvents: number;
  upcomingEvents: number;
  activeEvents: number;
  frozenEvents: number;
  quarantinedMediaCount: number;
}

export interface AdminAuditLogEntry {
  id: string;
  adminId: string;
  eventId?: string;
  mediaId?: string;
  action: 'FREEZE' | 'UNFREEZE' | 'DELETE' | 'QUARANTINE_MEDIA' | 'APPROVE_MEDIA' | 'OVERRIDE_PERMISSIONS';
  reason: string;
  timestamp: number;
}
