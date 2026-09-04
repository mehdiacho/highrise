import Fastify from 'fastify';
import cors from '@fastify/cors';
import { VERSION } from '@richup/shared';
import { CreateRoomBody } from '@richup/shared/wire';
import { createRoom, getRoom, listRooms } from './rooms.js';
import { attachSocketIO } from './socket.js';
import { generatePlayerId } from './io/random.js';

const fastify = Fastify({ logger: false });
await fastify.register(cors, { origin: true });

// ── REST ──────────────────────────────────────────────────────────────────────

fastify.get('/health', async () => ({ ok: true, version: VERSION }));

fastify.get('/rooms', async () => listRooms());

fastify.post('/rooms', async (req, reply) => {
  const parsed = CreateRoomBody.safeParse(req.body);
  if (!parsed.success) {
    return reply.code(400).send({ error: 'Invalid request body', details: parsed.error.flatten() });
  }

  const { hostName, color, settings } = parsed.data;
  const hostId = generatePlayerId();
  const { roomCode, state } = createRoom(hostId, hostName, color ?? '#3498db', settings);

  return reply.code(201).send({
    roomCode,
    hostId,
    playerCount: state.players.length,
  });
});

fastify.get<{ Params: { code: string } }>('/rooms/:code', async (req, reply) => {
  const room = getRoom(req.params.code.toUpperCase());
  if (!room) return reply.code(404).send({ error: 'Room not found' });

  return {
    roomCode: room.state.roomCode,
    status: room.state.status,
    playerCount: room.state.players.length,
    maxPlayers: room.state.settings.maxPlayers,
  };
});

// ── Static web bundle (single-container deploy) ─────────────────────────────────
// When WEB_ROOT points at a built web bundle, this server also serves the SPA so
// the whole game runs from one origin (no CORS, socket connects same-origin). In
// dev this is unset — Vite serves the web and proxies /socket.io + /rooms here.
const webRoot = process.env.WEB_ROOT;
if (webRoot) {
  const fastifyStatic = (await import('@fastify/static')).default;
  await fastify.register(fastifyStatic, { root: webRoot, wildcard: false });
  // SPA fallback: any unmatched GET that isn't an API/socket path serves index.html.
  fastify.setNotFoundHandler((req, reply) => {
    const isApi =
      req.url.startsWith('/rooms') ||
      req.url.startsWith('/socket.io') ||
      req.url.startsWith('/health');
    if (req.method === 'GET' && !isApi) {
      return reply.sendFile('index.html');
    }
    return reply.code(404).send({ error: 'Not found' });
  });
}

// ── Boot ──────────────────────────────────────────────────────────────────────

// Attach Socket.io to Fastify's own http.Server BEFORE calling listen,
// so both share the same port without a wrapper server in between.
await fastify.ready();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
attachSocketIO(fastify.server as any);

const port = Number(process.env.PORT ?? 3001);
await fastify.listen({ port, host: '0.0.0.0' });

// eslint-disable-next-line no-console
console.log(`[server] http://localhost:${port}  (richup v${VERSION})`);
