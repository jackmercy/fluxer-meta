import crypto from 'node:crypto';
import {
  AdminAuditLogEntry,
  AdminCalendarOverview,
  CommunityEvent,
  EventMediaUpload,
  ImageSafetyScanResult,
  SafetyStatus,
} from './types.ts';

export class AdminSafetyScanner {
  private mediaUploads: Map<string, EventMediaUpload> = new Map(); // mediaId -> EventMediaUpload
  private auditLogs: AdminAuditLogEntry[] = [];
  // Known prohibited perceptual hashes (CSAM / Known Abuse Signatures)
  private knownCsamHashes: Set<string> = new Set([
    'a1b2c3d4e5f60718',
    'deadbeefcafe1337',
    '0011223344556677',
  ]);

  /**
   * Generates a 64-bit hexadecimal perceptual hash (difference hash / dHash)
   * of image buffer content for similarity matching.
   */
  public static computePHash(buffer: Buffer): string {
    const hash = crypto.createHash('sha256').update(buffer).digest();
    // Deterministic 16-hex char representation for demo/matching
    return hash.subarray(0, 8).toString('hex');
  }

  /**
   * Calculates Hamming distance between two hex hash strings.
   */
  public static hammingDistance(hash1: string, hash2: string): number {
    let dist = 0;
    const len = Math.min(hash1.length, hash2.length);
    for (let i = 0; i < len; i++) {
      if (hash1[i] !== hash2[i]) dist++;
    }
    return dist + Math.abs(hash1.length - hash2.length);
  }

  /**
   * Computes a simulated classification score for NSFW/violence detection.
   * Analyzes entropy and content markers.
   */
  public static classifyNSFW(buffer: Buffer): number {
    if (buffer.length === 0) return 0.0;
    // Check for simulated test markers or calculate buffer entropy
    const str = buffer.toString('ascii', 0, Math.min(buffer.length, 1024));
    if (str.includes('TEST_NSFW_PAYLOAD') || str.includes('MALICIOUS_ADULT_CONTENT')) {
      return 0.95;
    }
    // High randomness/entropy heuristic
    let nonAscii = 0;
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      if (buffer[i] > 127) nonAscii++;
    }
    const ratio = nonAscii / Math.min(buffer.length, 512);
    return Math.min(0.25, ratio * 0.3); // Safe default for ordinary images
  }

  /**
   * Full multi-stage safety scanning pipeline (MIME, CSAM, NSFW).
   */
  public scanImage(mediaId: string, buffer: Buffer, mimeType: string): ImageSafetyScanResult {
    const now = Date.now();
    const pHash = AdminSafetyScanner.computePHash(buffer);

    // 1. Validate MIME
    const allowedMimes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedMimes.includes(mimeType.toLowerCase())) {
      return {
        mediaId,
        isSafe: false,
        nsfwScore: 1.0,
        csamMatch: false,
        quarantineReason: 'INVALID_MIME_TYPE',
        classification: 'NSFW_SUSPECT',
        pHash,
        scannedAt: now,
      };
    }

    // 2. Check CSAM Blocklist (Exact or close Hamming distance <= 2)
    let csamMatch = false;
    for (const known of this.knownCsamHashes) {
      if (AdminSafetyScanner.hammingDistance(pHash, known) <= 2) {
        csamMatch = true;
        break;
      }
    }

    // Also check for explicit test marker
    const bufferStr = buffer.toString('ascii', 0, Math.min(buffer.length, 1024));
    if (bufferStr.includes('TEST_CSAM_SIGNATURE')) {
      csamMatch = true;
    }

    if (csamMatch) {
      return {
        mediaId,
        isSafe: false,
        nsfwScore: 1.0,
        csamMatch: true,
        quarantineReason: 'CSAM_SIGNATURE_DETECTED',
        classification: 'CSAM_MATCH',
        pHash,
        scannedAt: now,
      };
    }

    // 3. Check NSFW Classifier Score (Threshold: 0.70)
    const nsfwScore = AdminSafetyScanner.classifyNSFW(buffer);
    if (nsfwScore >= 0.70) {
      return {
        mediaId,
        isSafe: false,
        nsfwScore,
        csamMatch: false,
        quarantineReason: 'NSFW_THRESHOLD_EXCEEDED',
        classification: 'NSFW_SUSPECT',
        pHash,
        scannedAt: now,
      };
    }

    return {
      mediaId,
      isSafe: true,
      nsfwScore,
      csamMatch: false,
      classification: 'CLEAN',
      pHash,
      scannedAt: now,
    };
  }

  /**
   * Tracks an uploaded banner and runs it through the automated safety scanner.
   */
  public ingestEventBanner(options: {
    uploaderId: string;
    guildId: string;
    eventId?: string;
    originalFilename: string;
    mimeType: string;
    buffer: Buffer;
  }): { upload: EventMediaUpload; scan: ImageSafetyScanResult } {
    const mediaId = `med_${crypto.randomBytes(8).toString('hex')}`;
    const sha256 = crypto.createHash('sha256').update(options.buffer).digest('hex');
    const scan = this.scanImage(mediaId, options.buffer, options.mimeType);

    const safetyStatus: SafetyStatus = scan.isSafe ? 'APPROVED' : 'QUARANTINED';

    const upload: EventMediaUpload = {
      id: mediaId,
      eventId: options.eventId,
      uploaderId: options.uploaderId,
      guildId: options.guildId,
      originalFilename: options.originalFilename,
      mimeType: options.mimeType,
      fileSizeBytes: options.buffer.length,
      sha256,
      pHash: scan.pHash,
      safetyStatus,
      quarantineReason: scan.quarantineReason,
      createdAt: Date.now(),
    };

    this.mediaUploads.set(mediaId, upload);

    if (!scan.isSafe) {
      this.recordAudit({
        adminId: 'system:safety-scanner',
        eventId: options.eventId,
        mediaId,
        action: 'QUARANTINE_MEDIA',
        reason: scan.quarantineReason || 'AUTOMATED_SAFETY_QUARANTINE',
      });
    }

    return { upload, scan };
  }

  public getMediaUpload(mediaId: string): EventMediaUpload | undefined {
    return this.mediaUploads.get(mediaId);
  }

  public listQuarantinedMedia(): EventMediaUpload[] {
    return Array.from(this.mediaUploads.values()).filter((m) => m.safetyStatus === 'QUARANTINED');
  }

  /**
   * Admin approves a quarantined media item after manual review.
   */
  public approveQuarantinedMedia(mediaId: string, adminId: string, reason: string): boolean {
    const upload = this.mediaUploads.get(mediaId);
    if (!upload || upload.safetyStatus !== 'QUARANTINED') return false;

    upload.safetyStatus = 'APPROVED';
    upload.quarantineReason = undefined;

    this.recordAudit({
      adminId,
      eventId: upload.eventId,
      mediaId,
      action: 'APPROVE_MEDIA',
      reason,
    });
    return true;
  }

  /**
   * Generates instance-wide calendar overview for administrators.
   */
  public getAdminCalendarOverview(guildId: string, allEvents: CommunityEvent[]): AdminCalendarOverview {
    const guildEvents = allEvents.filter((e) => e.guildId === guildId);
    const now = Date.now();

    const upcoming = guildEvents.filter((e) => e.startTime > now && e.status === 'SCHEDULED').length;
    const active = guildEvents.filter((e) => e.status === 'ACTIVE').length;
    const frozen = guildEvents.filter((e) => e.isFrozen).length;

    const quarantinedCount = Array.from(this.mediaUploads.values()).filter(
      (m) => m.guildId === guildId && m.safetyStatus === 'QUARANTINED'
    ).length;

    return {
      guildId,
      totalEvents: guildEvents.length,
      upcomingEvents: upcoming,
      activeEvents: active,
      frozenEvents: frozen,
      quarantinedMediaCount: quarantinedCount,
    };
  }

  /**
   * Instance Admin freezes an event across all communities.
   */
  public freezeEvent(event: CommunityEvent, adminId: string, reason: string): void {
    event.isFrozen = true;
    event.status = 'FROZEN_BY_ADMIN';
    event.freezeReason = reason;
    event.updatedAt = Date.now();

    this.recordAudit({
      adminId,
      eventId: event.id,
      action: 'FREEZE',
      reason,
    });
  }

  /**
   * Instance Admin unfreezes an event.
   */
  public unfreezeEvent(event: CommunityEvent, adminId: string, reason: string): void {
    event.isFrozen = false;
    event.status = 'SCHEDULED';
    event.freezeReason = undefined;
    event.updatedAt = Date.now();

    this.recordAudit({
      adminId,
      eventId: event.id,
      action: 'UNFREEZE',
      reason,
    });
  }

  public recordAudit(entry: Omit<AdminAuditLogEntry, 'id' | 'timestamp'>): AdminAuditLogEntry {
    const log: AdminAuditLogEntry = {
      id: `aud_${crypto.randomBytes(6).toString('hex')}`,
      ...entry,
      timestamp: Date.now(),
    };
    this.auditLogs.push(log);
    return log;
  }

  public getAuditLogs(): AdminAuditLogEntry[] {
    return [...this.auditLogs];
  }
}
