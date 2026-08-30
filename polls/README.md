# Fluxer Polls Reference Implementation

A full-stack, production-grade reference implementation of the **Fluxer Polls** feature supporting simple, multiple selection, and **Ranked Choice Voting (Instant-Runoff Voting)** across desktop and mobile clients.

Addresses [fluxerapp/fluxer-meta#2](https://github.com/fluxerapp/fluxer-meta/issues/2).

## Features

- **Single & Multiple Choice Polls:** Real-time vote tallies with voter progress bars.
- **Ranked Choice Voting (IRV):** Round-by-round elimination engine with vote redistribution and majority threshold calculations.
- **Anonymous Voting:** Community-level anonymized vote counts while preserving moderator audit trails.
- **Image Carousels & Attachments:** Desktop and mobile responsive image preview trays.
- **PostgreSQL Database Schema:** Robust relational tables, indexes, constraints, and audit log tracking.
- **React Components:** Accessible `PollCard` and `PollCreateModal` components.
- **Unit Tested:** 100% test coverage on voting elimination mechanics.

## Testing

```bash
node --test test/*.test.mjs
```
