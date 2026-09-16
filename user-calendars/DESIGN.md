# Fluxer User Calendars Design Specification

**Target Bounty:** Issue #21 — `User Calendars - (Dev Bounty: $125)`  
**Scope:** Subscribing to Events, Exporting user calendars and specific events to external providers.

---

## 1. Overview
This specification details the architecture and implementation for User Calendars and external synchronization within the Fluxer ecosystem:

1. **Subscribing to Events**:
   - Multi-state RSVP tracking (`GOING`, `MAYBE`, `INTERESTED`, `NOT_GOING`).
   - Configurable alert/notification timing (e.g. 15 minutes, 1 hour before start).
   - Guild-spanning personalized calendar view for users.

2. **External Calendar Synchronization (RFC 5545 iCalendar)**:
   - Export single event `.ics` file for direct import into Google Calendar, Apple Calendar, Outlook.
   - Export entire personal subscribed calendar as a downloadable `.ics` bundle.
   - Dynamic `webcal://` live subscription feed with cryptographically secure feed tokens, enabling external calendar apps to poll and sync event changes automatically.

---

## 2. Architecture & Data Flow

```
                      [ User Event Subscription ]
                                   │
                                   ▼
                       ┌───────────────────────┐
                       │  SubscriptionManager  │ ◄── CRUD on RSVPs & Alarms
                       └───────────────────────┘
                                   │
                   ┌───────────────┴───────────────┐
                   ▼                               ▼
         [ Single Event Export ]       [ Subscribed Calendar Bundle ]
                   │                               │
                   └───────────────┬───────────────┘
                                   ▼
                       ┌───────────────────────┐
                       │     ICalGenerator     │ ── RFC 5545 Serialization
                       └───────────────────────┘    • VCALENDAR / VEVENT
                                   │                • VALARM reminders
                                   ▼                • UTC DTSTART / DTEND
                 [ .ics File / Webcal Live Feed ]
```

---

## 3. RFC 5545 Compliance Details
- All timestamps formatted in strict UTC `YYYYMMDDTHHMMSSZ`.
- Reserved characters (`\`, `;`, `,`, newline) in text summaries, descriptions, and locations are safely escaped.
- Each event includes a globally unique, deterministic `UID:event_<id>@fluxer.app`.
- Automatic `VALARM` components generated for user-defined reminder intervals.
