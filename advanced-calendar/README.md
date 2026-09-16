# @fluxer/advanced-calendar

Reference implementation of the **Fluxer Advanced Calendar** features (Issue #22):
- 🔗 **Join-by-link Voice Channels**
- 👤 **Temporary / Guest Accounts**
- 🔒 **Password-Protected Voice Channels**

---

## Quick Start

### Installation & Testing
```bash
cd advanced-calendar
node --test test/advanced-calendar.test.mjs
```

### Usage Example

```typescript
import { AdvancedCalendarManager } from '@fluxer/advanced-calendar';

const manager = new AdvancedCalendarManager();

// 1. Create a Join Link for an Event Voice Channel
const link = manager.links.createLink({
  channelId: 'vc_stage_01',
  guildId: 'guild_main',
  creatorId: 'usr_admin',
  expiresInMs: 3600000, // 1 hour
  maxUses: 100,
  allowGuests: true,
  eventId: 'evt_community_call_2026',
});

// 2. Set Channel Password
manager.passwords.setPassword({
  channelId: 'vc_stage_01',
  password: 'SecretEventPassword123!',
  hint: 'Event ticket passcode',
});

// 3. Guest joins via link with password
const joinResult = manager.joinByLink({
  linkToken: link.token,
  password: 'SecretEventPassword123!',
  guestDisplayName: 'Alice Guest',
  ipAddress: '192.168.1.50',
});

console.log(joinResult.success); // true
console.log(joinResult.temporaryAccount?.displayName); // 'Alice Guest'

// 4. Guest upgrades to permanent account
const claimResult = manager.claimTemporaryAccount({
  temporaryToken: joinResult.temporaryAccount!.sessionToken,
  email: 'alice@example.com',
  password: 'NewStrongPassword456!',
  permanentUsername: 'alice_official',
});

console.log(claimResult.success); // true
```
