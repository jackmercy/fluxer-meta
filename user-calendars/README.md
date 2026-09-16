# @fluxer/user-calendars

Reference implementation of **Fluxer User Calendars** (Issue #21):
- 📅 **Event Subscriptions & Multi-state RSVPs**
- 📤 **RFC 5545 iCalendar (`.ics`) Single & Bundle Exports**
- 🌐 **Live Webcal Subscription Feeds (`webcal://`)**

---

## Quick Start

### Installation & Testing
```bash
cd user-calendars
node --test test/user-calendars.test.mjs
```

### Usage Example

```typescript
import { UserCalendarService } from '@fluxer/user-calendars';

const service = new UserCalendarService();

// 1. Register a Community Scheduled Event
service.subscriptions.registerEvent({
  id: 'evt_tech_talk_2026',
  guildId: 'guild_developers',
  name: 'Fluxer Voice Architecture Tech Talk',
  description: 'Deep dive into VoIP and WebRTC streaming.',
  startTime: Date.now() + 86400000, // Tomorrow
  endTime: Date.now() + 86400000 + 3600000,
  location: 'Stage Channel 1',
  url: 'https://fluxer.app/events/evt_tech_talk_2026',
  organizerId: 'usr_lead_dev',
});

// 2. User Subscribes / RSVPs
service.subscriptions.subscribe('usr_alice', 'evt_tech_talk_2026', 'GOING', [15, 60]);

// 3. Export Personal Calendar to RFC 5545 .ics
const icsContent = service.exportUserCalendar('usr_alice');
console.log(icsContent);
// Outputs standard BEGIN:VCALENDAR ... BEGIN:VEVENT ... BEGIN:VALARM ... END:VCALENDAR

// 4. Generate Live Webcal URL
const webcalUrl = service.getWebcalUrl('usr_alice');
console.log(webcalUrl);
// webcal://fluxer.app/api/v1/users/usr_alice/calendar.ics?token=...
```
