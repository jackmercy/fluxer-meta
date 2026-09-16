# @fluxer/community-events

Reference implementation for **Fluxer Community Events** (Issue #19) and **Instance Controls & Safety Scanners** (Issue #20).

---

## Features

- 🎪 **Visual Community Events Page**: Chronological feeds, status filters (`SCHEDULED`, `ACTIVE`, `COMPLETED`, `CANCELED`), keyword search.
- ✍️ **Complete CRUD Lifecycle**: Create, edit, cancel, and delete scheduled events with granular permission validation (`CREATE_EVENTS`, `MANAGE_EVENTS`).
- 🛡️ **NSFW & CSAM Safety Scanner**: Pre-ingestion image moderation pipeline with perceptual hashing (pHash) and automated quarantine.
- 📊 **Instance Admin Oversight**: Cross-guild event monitoring, emergency event freezing, and quarantined media review queues.

---

## Quick Start

### Testing
```bash
cd community-events
node --test test/community-events.test.mjs
```

### Usage Example

```typescript
import { CommunityEventsService, EventPermission } from '@fluxer/community-events';

const service = new CommunityEventsService();

// 1. Create Event with Banner (Automated Safety Scanning)
const result = service.createEventWithBanner({
  eventInput: {
    guildId: 'guild_gaming',
    name: 'Weekend Tournament',
    description: 'Join our weekly community match!',
    startTime: Date.now() + 86400000,
    organizerId: 'user_host',
  },
  actorPermissions: EventPermission.CREATE_EVENTS,
  bannerFilename: 'banner.png',
  bannerMimeType: 'image/png',
  bannerBuffer: Buffer.from('CLEAN_IMAGE_DATA_BYTES'),
});

console.log(result.event.name); // 'Weekend Tournament'
console.log(result.safetyScan?.classification); // 'CLEAN'

// 2. Admin Oversight & Freezing
service.safety.freezeEvent(result.event, 'admin_super', 'Suspicious activity report');
console.log(result.event.isFrozen); // true
```
