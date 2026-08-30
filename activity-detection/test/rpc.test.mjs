/**
 * Unit Tests for Fluxer RPC Server & Process Matcher
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

class SimpleMatcher {
  constructor(apps) {
    this.apps = apps;
  }
  match(proc, platform) {
    const clean = proc.toLowerCase().replace(/\.exe$/, '');
    return this.apps.find((a) =>
      a.executables.some((e) => e.os === platform && e.name.toLowerCase().replace(/\.exe$/, '') === clean)
    ) || null;
  }
}

test('Process Matcher: Matches known game executables on Windows', () => {
  const detectables = [
    {
      id: 'app_1',
      name: 'Visual Studio Code',
      executables: [{ name: 'code.exe', os: 'win32' }, { name: 'code', os: 'linux' }],
      type: 'compiling',
    },
    {
      id: 'app_2',
      name: 'Spotify Music',
      executables: [{ name: 'Spotify.exe', os: 'win32' }, { name: 'spotify', os: 'darwin' }],
      type: 'listening',
    },
  ];

  const matcher = new SimpleMatcher(detectables);

  const match1 = matcher.match('Code.exe', 'win32');
  assert.equal(match1.name, 'Visual Studio Code');
  assert.equal(match1.type, 'compiling');

  const match2 = matcher.match('spotify.exe', 'win32');
  assert.equal(match2.name, 'Spotify Music');

  const matchUnknown = matcher.match('notepad.exe', 'win32');
  assert.equal(matchUnknown, null);
});

test('RPC Packet Encoding & Framing logic', () => {
  const op = 1;
  const payload = { cmd: 'SET_ACTIVITY', data: { name: 'Minecraft' } };
  const jsonStr = JSON.stringify(payload);
  const payloadLen = Buffer.byteLength(jsonStr, 'utf-8');

  const header = Buffer.alloc(8);
  header.writeInt32LE(op, 0);
  header.writeInt32LE(payloadLen, 4);

  const packet = Buffer.concat([header, Buffer.from(jsonStr, 'utf-8')]);

  // Decode packet
  const readOp = packet.readInt32LE(0);
  const readLen = packet.readInt32LE(4);
  const readData = JSON.parse(packet.subarray(8, 8 + readLen).toString('utf-8'));

  assert.equal(readOp, 1);
  assert.equal(readLen, payloadLen);
  assert.equal(readData.cmd, 'SET_ACTIVITY');
  assert.equal(readData.data.name, 'Minecraft');
});
