# Fluxer RPC & Activity Detection Specification

## Overview

Enables desktop and mobile Fluxer users to broadcast and view real-time rich presence (games, coding environments, media).

## Architecture

1. **`FluxerRpcServer`**: Listens on local IPC named pipes / domain sockets, decoding 8-byte framed packets.
2. **`ProcessMatcher`**: Scans running processes against a manifest of recognized software titles.
