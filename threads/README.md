# Fluxer Threads Reference Implementation

A reference implementation for **Fluxer Threads (Sub-channels)** fulfilling the requirements of [fluxerapp/fluxer-meta#5](https://github.com/fluxerapp/fluxer-meta/issues/5).

## Features

- **Sub-Channel Lifecycle:** Create, join, leave, preview, close, reopen, archive, unarchive.
- **Permissions Inheritance:** Inherits parent channel view/send rights with community role controls.
- **Auto-Expiry Engine:** Configurable inactivity archiving (1h, 24h, 3d, 7d).
- **Desktop & Mobile Responsive:** Sidebar previews, inline chat boxes, and message threads.

## Testing

```bash
node --test test/*.test.mjs
```
