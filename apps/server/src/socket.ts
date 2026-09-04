import type { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { GameState } from '@richup/shared/types';
import { reduce, GameRuleError } from '@richup/shared/engine/reduce';
import { botAction } from '@richup/shared/bot';
import { rollDice, generatePlayerId } from './io/random.js';
import {
  getRoom,
  setRoomState,
  addPlayerToRoom,
  addBotToRoom,
  createRoom,
} from './rooms.js';

const debug = process.env.DEBUG
  ? (msg: string) => console.log(`[socket] ${msg}`)
  : () => {};

function broadcast(io: Server, roomCode: string, event: string, data: unknown): void {
  io.to(roomCode).emit(event, data);
}

function emitState(io: Server, roomCode: string, state: GameState): void {
  broadcast(io, roomCode, 'message', { event: 'state', state });
}

function emitError(socket: Socket, code: string, message: string): void {
  socket.emit('message', { event: 'error', code, message });
}

/** Dispatch an action from the current player. Returns the new state or throws. */
function dispatch(roomCode: string, action: Parameters<typeof reduce>[1]): GameState {
  const room = getRoom(roomCode);
  if (!room) throw new GameRuleError('Room not found', 'ROOM_NOT_FOUND');

  // For roll actions, server supplies the dice
  const actionWithDice =
    action.type === 'roll'
      ? { ...action, dice: rollDice() }
      : action;

  const { state: next } = reduce(room.state, actionWithDice);
  setRoomState(roomCode, next);
  return next;
}

/** Schedule a bot move with a small delay for realistic feel */
function scheduleBotMove(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  if (room.botTimer) {
    clearTimeout(room.botTimer);
    room.botTimer = null;
  }

  const state = room.state;
  if (state.status !== 'in_progress') return;

  const cp = state.players[state.currentPlayerIndex];
  if (!cp || !cp.isBot) return;

  room.botTimer = setTimeout(() => {
    runBotTurn(io, roomCode, cp.id);
  }, 400 + Math.random() * 600);
}

function runBotTurn(io: Server, roomCode: string, botId: string): void {
  const room = getRoom(roomCode);
  if (!room) return;

  const state = room.state;
  const action = botAction(state, botId);
  if (!action) return;

  try {
    const next = dispatch(roomCode, action);
    emitState(io, roomCode, next);

    // Check if bot still needs to act
    const nextRoom = getRoom(roomCode);
    if (!nextRoom) return;
    const nextState = nextRoom.state;
    const cp = nextState.players[nextState.currentPlayerIndex];

    if (cp?.id === botId && nextState.status === 'in_progress') {
      // Bot has more to do (e.g. auction, post_action builds)
      scheduleBotMove(io, roomCode);
    } else if (cp?.isBot && nextState.status === 'in_progress') {
      // Next player is also a bot
      scheduleBotMove(io, roomCode);
    }
  } catch (err) {
    debug(`Bot error: ${err instanceof Error ? err.message : err}`);
  }
}

function handleAuctionBots(io: Server, roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room || !room.state.auction) return;

  const { auction } = room.state;
  const botsInAuction = room.state.players.filter(
    (p) => p.isBot && auction.participantIds.includes(p.id),
  );

  for (const bot of botsInAuction) {
    const action = botAction(room.state, bot.id);
    if (!action) continue;
    try {
      const next = dispatch(roomCode, action);
      setRoomState(roomCode, next);
    } catch {
      // ignore
    }
  }

  const updatedRoom = getRoom(roomCode);
  if (updatedRoom) emitState(io, roomCode, updatedRoom.state);
}

export function attachSocketIO(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  // Map socket.id → { roomCode, playerId, spectator }
  // Spectators hold a `s_*` id that is deliberately NOT a player in the room:
  // they receive state broadcasts but every action is refused.
  const socketMap = new Map<
    string,
    { roomCode: string; playerId: string; spectator: boolean }
  >();

  io.on('connection', (socket) => {
    debug(`connect ${socket.id}`);

    socket.on('message', (msg: unknown) => {
      const ctx = socketMap.get(socket.id);

      try {
        if (typeof msg !== 'object' || msg === null || !('type' in msg)) {
          return emitError(socket, 'BAD_MESSAGE', 'Invalid message format');
        }

        const m = msg as Record<string, unknown>;

        // ── join_room ─────────────────────────────────────────────────────
        if (m['type'] === 'join_room') {
          const roomCode = String(m['roomCode'] ?? '').toUpperCase();
          const playerName = String(m['playerName'] ?? 'Guest').slice(0, 24);
          const color = String(m['color'] ?? '#3498db');
          const claimedId = m['playerId'] ? String(m['playerId']) : undefined;

          const room = getRoom(roomCode);
          if (!room) return emitError(socket, 'ROOM_NOT_FOUND', 'Room not found');

          // Resolve player id: prefer claimed id if it matches an existing player (host reconnect)
          let playerId = ctx?.playerId;
          let spectator = ctx?.spectator ?? false;

          if (!playerId) {
            if (claimedId && room.state.players.some((p) => p.id === claimedId)) {
              // Reconnecting as existing player (e.g. host whose id came from POST /rooms).
              // Allowed mid-game — this is a rejoin, not a new seat.
              playerId = claimedId;
            } else if (room.state.status === 'lobby') {
              // Truly new join, game not started yet → take a seat.
              const newPlayerId = generatePlayerId();
              const player = addPlayerToRoom(roomCode, newPlayerId, playerName, color);
              if (!player) return emitError(socket, 'ROOM_FULL', 'Room is full');
              playerId = newPlayerId;
            } else {
              // Game already in progress → watch instead of being turned away.
              playerId = `s_${Math.random().toString(36).slice(2, 6)}`;
              spectator = true;
            }
          }

          socketMap.set(socket.id, { roomCode, playerId, spectator });
          socket.join(roomCode);

          // Tell this client who it is (and whether it may act), then send state.
          socket.emit('message', { event: 'joined', playerId, roomCode, spectator });

          const updatedRoom = getRoom(roomCode)!;
          emitState(io, roomCode, updatedRoom.state);
          return;
        }

        // ── add_bot ───────────────────────────────────────────────────────
        if (m['type'] === 'add_bot') {
          if (!ctx) return emitError(socket, 'NOT_IN_ROOM', 'Join a room first');
          if (ctx.spectator) return emitError(socket, 'SPECTATOR', 'Spectators cannot act');
          const bot = addBotToRoom(ctx.roomCode);
          if (!bot) return emitError(socket, 'CANT_ADD_BOT', 'Cannot add bot');
          const room = getRoom(ctx.roomCode)!;
          emitState(io, ctx.roomCode, room.state);
          return;
        }

        // ── start_game ────────────────────────────────────────────────────
        if (m['type'] === 'start_game') {
          if (!ctx) return emitError(socket, 'NOT_IN_ROOM', 'Join a room first');
          if (ctx.spectator) return emitError(socket, 'SPECTATOR', 'Spectators cannot act');
          const next = dispatch(ctx.roomCode, { type: 'start_game', playerId: ctx.playerId });
          emitState(io, ctx.roomCode, next);
          scheduleBotMove(io, ctx.roomCode);
          return;
        }

        // ── game actions ──────────────────────────────────────────────────
        if (!ctx) return emitError(socket, 'NOT_IN_ROOM', 'Join a room first');
        if (ctx.spectator) return emitError(socket, 'SPECTATOR', 'Spectators cannot act');

        const actionType = m['type'] as string;

        let action: Parameters<typeof reduce>[1] | null = null;

        switch (actionType) {
          case 'roll':
            action = { type: 'roll', playerId: ctx.playerId, dice: [1, 1] }; // dice replaced in dispatch
            break;
          case 'buy':
            action = { type: 'buy', playerId: ctx.playerId };
            break;
          case 'decline':
            action = { type: 'decline', playerId: ctx.playerId };
            break;
          case 'bid': {
            const inc = Number(m['increment']);
            if (![2, 10, 100].includes(inc)) return emitError(socket, 'BAD_INCREMENT', 'Invalid bid increment');
            action = { type: 'bid', playerId: ctx.playerId, increment: inc as 2 | 10 | 100 };
            break;
          }
          case 'pass_auction':
            action = { type: 'pass_auction', playerId: ctx.playerId };
            break;
          case 'end_turn':
            action = { type: 'end_turn', playerId: ctx.playerId };
            break;
          case 'mortgage':
            action = { type: 'mortgage', playerId: ctx.playerId, tilePosition: Number(m['tilePosition']) };
            break;
          case 'unmortgage':
            action = { type: 'unmortgage', playerId: ctx.playerId, tilePosition: Number(m['tilePosition']) };
            break;
          case 'build':
            action = { type: 'build', playerId: ctx.playerId, tilePosition: Number(m['tilePosition']) };
            break;
          case 'sell_building':
            action = { type: 'sell_building', playerId: ctx.playerId, tilePosition: Number(m['tilePosition']) };
            break;
          case 'trade_create':
            action = {
              type: 'trade_create',
              playerId: ctx.playerId,
              toId: String(m['toId']),
              offer: m['offer'] as Parameters<typeof reduce>[1] extends { offer: infer O } ? O : never,
              demand: m['demand'] as Parameters<typeof reduce>[1] extends { demand: infer D } ? D : never,
            };
            break;
          case 'trade_respond':
            action = {
              type: 'trade_respond',
              playerId: ctx.playerId,
              tradeId: String(m['tradeId']),
              action: m['action'] as 'accept' | 'reject',
            };
            break;
          case 'pay_jail_fine':
            action = { type: 'pay_jail_fine', playerId: ctx.playerId };
            break;
          case 'use_jail_card':
            action = { type: 'use_jail_card', playerId: ctx.playerId };
            break;
          case 'declare_bankrupt':
            action = { type: 'declare_bankrupt', playerId: ctx.playerId };
            break;
          default:
            return emitError(socket, 'UNKNOWN_ACTION', `Unknown action: ${actionType}`);
        }

        if (!action) return;

        const next = dispatch(ctx.roomCode, action);
        emitState(io, ctx.roomCode, next);

        // After human action, handle auction bots then schedule next bot turn
        const room = getRoom(ctx.roomCode);
        if (room?.state.turnPhase === 'auction') {
          handleAuctionBots(io, ctx.roomCode);
        }

        scheduleBotMove(io, ctx.roomCode);

      } catch (err) {
        if (err instanceof GameRuleError) {
          emitError(socket, err.code, err.message);
        } else {
          debug(`Unexpected error: ${err instanceof Error ? err.message : err}`);
          emitError(socket, 'INTERNAL_ERROR', 'Internal server error');
        }
      }
    });

    socket.on('disconnect', () => {
      debug(`disconnect ${socket.id}`);
      socketMap.delete(socket.id);
    });
  });

  return io;
}
