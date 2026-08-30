# Fluxer Polls - Architectural Design Specification

## Overview

The Polls architecture satisfies the requirements in Issue #2 for simple polls, image attachments, ranked choice voting, anonymous ballots, and community/instance moderation audit logs.

## Components & Modules

1. **`schema.sql`**: PostgreSQL database schema with `polls`, `poll_options`, `poll_votes`, `poll_ranked_ballots`, and `poll_audit_logs`.
2. **`ranked-choice.ts`**: Pure Instant-Runoff Voting (IRV) algorithm computing sequential rounds and vote transfers.
3. **`api.ts`**: Client/server API definitions for poll creation, voting, and real-time result queries.
4. **`state/pollStore.ts`**: Reactive client-side store with optimistic updates and local selection caching.
5. **`components/PollCard.tsx`**: Modular UI card rendering questions, options, progress percentages, and voter trays.
6. **`components/PollCreateModal.tsx`**: Creation modal supporting custom duration, anonymous toggling, and image uploads.
