# Fluxer Rich Presence & Activity Detection

A production reference implementation for **Activity Auto-Discovery & Discord-compatible Rich Presence IPC RPC Protocol**.

Addresses [fluxerapp/fluxer-meta#8](https://github.com/fluxerapp/fluxer-meta/issues/8).

## Features

- **Cross-Platform Local IPC Server:** Named pipes (`\\.\pipe\fluxer-ipc-0`) on Windows and Unix Domain Sockets on Linux/macOS.
- **Protocol Compatibility:** Fully compatible with Discord RPC client libraries (e.g. `discord-rpc`, game SDKs).
- **Process Auto-Discovery:** Native executable pattern matching against detectable applications.
- **Activity Events:** Live events for activity updates, clear, and socket disconnection.

## Running Tests

```bash
node --test test/*.test.mjs
```
