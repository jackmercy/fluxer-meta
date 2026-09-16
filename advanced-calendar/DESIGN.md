# Fluxer Advanced Calendar & Voice Channels Design Specification

**Target Bounty:** Issue #22 — `Advanced Calendar - (Dev Bounty: $125)`  
**Scope:** Join-by-link VCs, Temporary Accounts, Password Protected VCs.

---

## 1. Overview
This specification details the architecture and implementation for extended Voice Channel (VC) capabilities integrated into the Fluxer Calendar & Events ecosystem:

1. **Join-by-link VCs**: Secure, cryptographic invite links that allow users to jump directly into calendar-linked or stand-alone voice channels without requiring server pre-membership.
2. **Temporary Accounts**: Ephemeral guest sessions enabling instant voice participation with zero-friction onboarding, automatic session TTL expiration, and one-click account upgrade/claiming.
3. **Password Protected VCs**: Salted SHA-256 password/PIN protection with constant-time verification, brute-force rate-limiting, and seamless reconnection unlock grants.

---

## 2. Component Architecture

```
                       [ Incoming Web / Deep Link ]
                                     │
                                     ▼
                          ┌──────────────────────┐
                          │   JoinLinkManager    │ ── Validates token, expiry,
                          └──────────────────────┘    max uses, event binding
                                     │
                   ┌─────────────────┴─────────────────┐
                   ▼                                   ▼
         [ Password Required? ]              [ User Registered? ]
                   │                                   │
                   ├─ Yes ──► VCPasswordService        ├─ No ──► TemporaryAccountService
                   │          • Salted Hash                      • Ephemeral ID
                   │          • Rate Limit & Lockout             • Auto TTL Expiration
                   │          • Unlock Grace Grant               • Account Conversion
                   │                                   │
                   └─────────────────┬─────────────────┘
                                     ▼
                        [ Voice Session Granted ]
```

---

## 3. Security Considerations
- **Brute Force Protection**: Failed password attempts are tracked per client identifier (IP or Session). After 5 consecutive failures, the client is locked out for 5 minutes.
- **Timing Attacks**: Password hash comparison uses `crypto.timingSafeEqual` to eliminate timing side-channels.
- **Ephemeral Storage Purge**: Temporary guest accounts have strict TTL limits. Background jobs and on-disconnect handlers purge expired credentials.
- **Permanent Claiming**: When converting a temporary account to a permanent registered account, all prior session keys are rotated, and email/username uniqueness is strictly enforced.
