import { io, Socket } from 'socket.io-client';
import type { CreateRoomResponse } from '@richup/shared/wire';

/**
 * Transport client for online play. Defaults to the page origin ("" → relative
 * URLs): in production one container serves both the web bundle and the socket
 * server, and in dev Vite proxies `/socket.io` + `/rooms` to the server on 3001
 * (see vite.config.ts). Override with VITE_SERVER_URL to point at a separate
 * host (e.g. a Firebase-hosted bundle talking to a remote game server).
 */
export const SERVER_URL =
  (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SERVER_URL ?? '';

type Message = { event: string; [k: string]: unknown };
type MessageHandler = (msg: Message) => void;

let socket: Socket | null = null;
const handlers = new Set<MessageHandler>();

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SERVER_URL || undefined, { transports: ['websocket'], autoConnect: true });
    socket.on('message', (msg: Message) => {
      for (const h of handlers) h(msg);
    });
  }
  return socket;
}

export function onMessage(handler: MessageHandler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function send(msg: Record<string, unknown>): void {
  getSocket().emit('message', msg);
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  handlers.clear();
}

/** REST: create a room, returning its code and the host's player id. */
export async function createRoomRest(
  hostName: string,
  color: string,
  maxPlayers = 12,
): Promise<CreateRoomResponse> {
  const res = await fetch(`${SERVER_URL}/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostName, color, settings: { maxPlayers } }),
  });
  if (!res.ok) throw new Error(`Create room failed (${res.status})`);
  return (await res.json()) as CreateRoomResponse;
}

export function joinRoom(roomCode: string, playerName: string, color: string, playerId?: string): void {
  send({ type: 'join_room', roomCode, playerName, color, ...(playerId ? { playerId } : {}) });
}
