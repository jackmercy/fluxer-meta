/**
 * Fluxer RPC & Activity Detection - Types
 */

export type ActivityType = 'playing' | 'listening' | 'streaming' | 'watching' | 'compiling' | 'custom';

export interface ActivityTimestamps {
  start?: number; // epoch ms
  end?: number;
}

export interface ActivityAssets {
  largeImage?: string;
  largeText?: string;
  smallImage?: string;
  smallText?: string;
}

export interface ActivityParty {
  id?: string;
  size?: [currentSize: number, maxSize: number];
}

export interface ActivitySecrets {
  join?: string;
  spectate?: string;
  match?: string;
}

export interface Activity {
  id: string;
  name: string;
  type: ActivityType;
  details?: string;
  state?: string;
  timestamps?: ActivityTimestamps;
  assets?: ActivityAssets;
  party?: ActivityParty;
  secrets?: ActivitySecrets;
  applicationId?: string;
  syncId?: string;
  createdAt: number;
}

export interface DetectableApplication {
  id: string;
  name: string;
  executables: Array<{
    name: string;
    os: 'win32' | 'darwin' | 'linux';
    arguments?: string[];
  }>;
  type?: ActivityType;
  icon?: string;
}

export enum RpcOpcode {
  HANDSHAKE = 0,
  FRAME = 1,
  CLOSE = 2,
  PING = 3,
  PONG = 4,
}

export interface RpcPacket<T = any> {
  op: RpcOpcode;
  nonce?: string | null;
  cmd?: string;
  evt?: string | null;
  data?: T;
}
