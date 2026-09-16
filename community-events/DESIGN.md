# Fluxer Community Events & Instance Controls/Safety Design Specification

**Target Bounties:**
- Issue #19 — `Community Events - (Dev Bounty $250*)`
- Issue #20 — `Instance Controls / Safety - (Dev Bounty: $250)`

---

## 1. Overview
This specification delivers the unified Community Events and Instance Admin Safety architecture for Fluxer:

1. **Community Events (#19)**:
   - Visual Events page in Communities with chronological feeds, search, and status filters.
   - Complete event CRUD (`createEvent`, `updateEvent`, `cancelEvent`, `deleteEvent`).
   - Granular permission system (`CREATE_EVENTS`, `MANAGE_EVENTS`, `ADMIN_OVERRIDE`).
2. **Instance Controls & Safety Scanners (#20)**:
   - Global Admin Calendar dashboard with cross-community oversight and emergency event freezing.
   - Comprehensive event media tracking (SHA-256 and perceptual hash pHash).
   - Multi-stage automated moderation pipeline intercepting NSFW content and known CSAM perceptual hashes.
   - Quarantine storage with administrative review and immutable audit logging.

---

## 2. System Architecture

```
                 [ Community User / Organizer ]
                               │
                (1) Create Event & Upload Banner
                               │
                               ▼
                   ┌───────────────────────┐
                   │  AdminSafetyScanner   │
                   └───────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       [ MIME & Size OK? ]            [ Perceptual Hash pHash ]
               │                               │
               ├─ No ──► Reject                ├─ Known CSAM Match? ──► Auto-Quarantine
               │                               │
               ▼                               ▼
     [ NSFW Classifier ]             [ Safe & Clean ]
               │                               │
               ├─ Score >= 0.70 ──► Quarantine └─► Approve & Publish to CDN
               │
               ▼
   ┌───────────────────────┐
   │ CommunityEventManager │ ◄── Verifies CREATE_EVENTS permission
   └───────────────────────┘
               │
               ▼
     [ Visual Events Feed ] ◄── Community Members
               ▲
               │ (Administrative Oversight)
   ┌───────────────────────┐
   │  Instance Admin Panel │ ── Cross-Guild Calendar Overview
   └───────────────────────┘    Emergency Event Freeze / Unfreeze
                                Quarantined Media Review Queue
```

---

## 3. Safety Pipeline Specifications
- **MIME Whitelist**: `image/png`, `image/jpeg`, `image/webp`.
- **Perceptual Hashing**: Fast 64-bit dHash/pHash algorithm with Hamming distance matching against prohibited hash databases.
- **Quarantine Workflow**: Quarantined images are immediately blocked from public CDN distribution; events are published with a clean fallback placeholder until admin clearance.
- **Audit Logs**: Every administrative freeze, unfreeze, and media approval records an immutable audit log entry.
