/**
 * Local IPC RPC Server for Desktop Clients (Discord RPC protocol compatible)
 */

import net from 'net';
import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';
import { Activity, RpcOpcode, RpcPacket } from './types';

export class FluxerRpcServer extends EventEmitter {
  private server: net.Server | null = null;
  private socketPath: string;
  private activeClients: Set<net.Socket> = new Set();
  private currentActivity: Activity | null = null;

  constructor(pipeIndex: number = 0) {
    super();
    if (os.platform() === 'win32') {
      this.socketPath = `\\\\.\\pipe\\fluxer-ipc-${pipeIndex}`;
    } else {
      const tempDir = process.env.XDG_RUNTIME_DIR || process.env.TMPDIR || '/tmp';
      this.socketPath = path.join(tempDir, `fluxer-ipc-${pipeIndex}`);
    }
  }

  getSocketPath(): string {
    return this.socketPath;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => this.handleConnection(socket));
      this.server.on('error', (err) => reject(err));
      this.server.listen(this.socketPath, () => {
        this.emit('listening', this.socketPath);
        resolve();
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      for (const socket of this.activeClients) {
        socket.destroy();
      }
      this.activeClients.clear();
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleConnection(socket: net.Socket) {
    this.activeClients.add(socket);
    let buffer = Buffer.alloc(0);

    socket.on('data', (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 8) {
        const op = buffer.readInt32LE(0);
        const length = buffer.readInt32LE(4);

        if (buffer.length < 8 + length) {
          break; // wait for full payload
        }

        const payloadBuffer = buffer.subarray(8, 8 + length);
        buffer = buffer.subarray(8 + length);

        try {
          const payload = JSON.parse(payloadBuffer.toString('utf-8')) as RpcPacket;
          this.handlePacket(socket, op as RpcOpcode, payload);
        } catch (err) {
          this.emit('error', err);
        }
      }
    });

    socket.on('close', () => {
      this.activeClients.delete(socket);
      this.emit('clientDisconnected', socket);
    });
  }

  private handlePacket(socket: net.Socket, op: RpcOpcode, packet: RpcPacket) {
    switch (op) {
      case RpcOpcode.HANDSHAKE: {
        const res: RpcPacket = {
          op: RpcOpcode.FRAME,
          cmd: 'DISPATCH',
          evt: 'READY',
          data: {
            v: 1,
            config: {
              api_endpoint: '//fluxer.app/api',
              environment: 'production',
            },
            user: {
              id: 'fluxer-local-user',
              username: 'Fluxer User',
            },
          },
        };
        this.sendPacket(socket, RpcOpcode.FRAME, res);
        this.emit('handshake', packet.data);
        break;
      }
      case RpcOpcode.FRAME: {
        if (packet.cmd === 'SET_ACTIVITY') {
          const activityData = packet.data?.activity;
          if (activityData) {
            this.currentActivity = {
              id: `act_${Date.now()}`,
              name: activityData.name || 'Unknown Application',
              type: activityData.type || 'playing',
              details: activityData.details,
              state: activityData.state,
              timestamps: activityData.timestamps,
              assets: activityData.assets,
              party: activityData.party,
              secrets: activityData.secrets,
              createdAt: Date.now(),
            };
            this.emit('activityUpdate', this.currentActivity);
          } else {
            this.currentActivity = null;
            this.emit('activityClear');
          }

          const response: RpcPacket = {
            op: RpcOpcode.FRAME,
            cmd: 'SET_ACTIVITY',
            nonce: packet.nonce,
            data: this.currentActivity,
          };
          this.sendPacket(socket, RpcOpcode.FRAME, response);
        }
        break;
      }
      case RpcOpcode.PING: {
        this.sendPacket(socket, RpcOpcode.PONG, { op: RpcOpcode.PONG, data: packet.data });
        break;
      }
    }
  }

  private sendPacket(socket: net.Socket, op: RpcOpcode, payload: any) {
    const jsonStr = JSON.stringify(payload);
    const payloadLen = Buffer.byteLength(jsonStr, 'utf-8');
    const header = Buffer.alloc(8);
    header.writeInt32LE(op, 0);
    header.writeInt32LE(payloadLen, 4);
    socket.write(Buffer.concat([header, Buffer.from(jsonStr, 'utf-8')]));
  }

  getCurrentActivity(): Activity | null {
    return this.currentActivity;
  }
}
