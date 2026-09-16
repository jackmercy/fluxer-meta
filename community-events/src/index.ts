import { CommunityEventManager } from './event-manager.ts';
import { AdminSafetyScanner } from './admin-safety-scanner.ts';
import {
  AdminAuditLogEntry,
  AdminCalendarOverview,
  CommunityEvent,
  CreateEventInput,
  EventPermission,
  ImageSafetyScanResult,
  UpdateEventInput,
} from './types.ts';

export * from './types.ts';
export { CommunityEventManager } from './event-manager.ts';
export { AdminSafetyScanner } from './admin-safety-scanner.ts';

export class CommunityEventsService {
  public events: CommunityEventManager;
  public safety: AdminSafetyScanner;

  constructor() {
    this.events = new CommunityEventManager();
    this.safety = new AdminSafetyScanner();
  }

  /**
   * Integrated flow: Uploads and scans event banner image, then creates event
   * with safety check enforcement.
   */
  public createEventWithBanner(options: {
    eventInput: Omit<CreateEventInput, 'bannerMediaId' | 'bannerUrl'>;
    actorPermissions: number;
    bannerFilename?: string;
    bannerMimeType?: string;
    bannerBuffer?: Buffer;
  }): { event: CommunityEvent; safetyScan?: ImageSafetyScanResult } {
    let bannerMediaId: string | undefined;
    let bannerUrl: string | undefined;
    let safetyScan: ImageSafetyScanResult | undefined;

    if (options.bannerBuffer && options.bannerFilename && options.bannerMimeType) {
      const { upload, scan } = this.safety.ingestEventBanner({
        uploaderId: options.eventInput.organizerId,
        guildId: options.eventInput.guildId,
        originalFilename: options.bannerFilename,
        mimeType: options.bannerMimeType,
        buffer: options.bannerBuffer,
      });

      safetyScan = scan;
      bannerMediaId = upload.id;

      if (scan.isSafe) {
        bannerUrl = `https://cdn.fluxer.app/events/${upload.guildId}/${upload.id}`;
      } else {
        // Banner quarantined - event created with placeholder or quarantined state
        bannerUrl = undefined;
      }
    }

    const event = this.events.createEvent(
      {
        ...options.eventInput,
        bannerMediaId,
        bannerUrl,
      },
      options.actorPermissions
    );

    return { event, safetyScan };
  }

  /**
   * Generates admin calendar dashboard report.
   */
  public getAdminReport(guildId: string): AdminCalendarOverview {
    const all = this.events.listEventsForGuild(guildId);
    return this.safety.getAdminCalendarOverview(guildId, all);
  }
}
