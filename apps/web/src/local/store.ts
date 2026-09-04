import { create } from 'zustand';
import type { GameState, Action } from '@richup/shared/types';
import { GameRuleError } from '@richup/shared/engine/reduce';
import { reduce } from '@richup/shared/engine/reduce';
import { createGame, injectDice, type SetupPlayer } from './engine.js';
import {
  getSocket,
  onMessage,
  send as socketSend,
  disconnectSocket,
  createRoomRest,
  joinRoom,
} from '../net/socket.js';

/**
 * Given the player who just acted, find the next seat that is still an auction
 * participant, walking forward in seating order. Used to drive whose bid
 * controls are live on the shared (hot-seat) screen — a UI concern only; the
 * engine itself treats bids as a free-for-all.
 */
function nextParticipant(state: GameState, fromId: string, participants: string[]): string | null {
  if (participants.length === 0) return null;
  if (participants.length === 1) return participants[0]!;
  const order = state.players.map((p) => p.id);
  const start = order.indexOf(fromId);
  for (let step = 1; step <= order.length; step++) {
    const candidate = order[(start + step) % order.length]!;
    if (participants.includes(candidate)) return candidate;
  }
  return participants[0]!;
}

function deriveActiveSeat(state: GameState, auctionBidderId: string | null): string | null {
  if (state.status !== 'in_progress') return null;
  if (state.turnPhase === 'auction') return auctionBidderId;
  return state.players[state.currentPlayerIndex]?.id ?? null;
}

/** Map an engine Action to a wire message (server infers playerId + dice). */
function toWire(action: Action): Record<string, unknown> | null {
  switch (action.type) {
    case 'roll':
      return { type: 'roll' };
    case 'buy':
      return { type: 'buy' };
    case 'decline':
      return { type: 'decline' };
    case 'bid':
      return { type: 'bid', increment: action.increment };
    case 'pass_auction':
      return { type: 'pass_auction' };
    case 'end_turn':
      return { type: 'end_turn' };
    case 'mortgage':
      return { type: 'mortgage', tilePosition: action.tilePosition };
    case 'unmortgage':
      return { type: 'unmortgage', tilePosition: action.tilePosition };
    case 'build':
      return { type: 'build', tilePosition: action.tilePosition };
    case 'sell_building':
      return { type: 'sell_building', tilePosition: action.tilePosition };
    case 'trade_create':
      return { type: 'trade_create', toId: action.toId, offer: action.offer, demand: action.demand };
    case 'trade_respond':
      return { type: 'trade_respond', tradeId: action.tradeId, action: action.action };
    case 'pay_jail_fine':
      return { type: 'pay_jail_fine' };
    case 'use_jail_card':
      return { type: 'use_jail_card' };
    case 'declare_bankrupt':
      return { type: 'declare_bankrupt' };
    default:
      return null; // start_game / add_bot are sent explicitly
  }
}

/** How property labels are laid out on the board. */
export type TextOrientation = 'uniform' | 'inward';

export interface BoardSettings {
  /** `uniform` reads L→R everywhere; `inward` rotates labels to face center. */
  textOrientation: TextOrientation;
}

export type GameMode = 'local' | 'online';

interface GameStore {
  state: GameState | null;
  mode: GameMode;
  /** Whose action controls are live right now. Local: current player / auction
   *  bidder (hot-seat pointer). Online: always this client's own player. */
  activeSeatId: string | null;
  auctionBidderId: string | null;
  /** Online: this client's own player id + room. */
  myPlayerId: string | null;
  roomCode: string | null;
  /** Joined a game already in progress — watching only, no controls. */
  isSpectator: boolean;
  connecting: boolean;
  error: string | null;
  /** Bumped on every roll so the dice component can replay its animation. */
  rollNonce: number;
  rolling: boolean;
  boardSettings: BoardSettings;

  // Local (hot-seat)
  start: (players: SetupPlayer[]) => void;
  // Online
  createOnline: (name: string, color: string) => Promise<void>;
  joinOnline: (roomCode: string, name: string, color: string) => Promise<void>;
  startOnline: () => void;
  addBotOnline: () => void;

  quit: () => void;
  dispatch: (action: Action) => void;
  clearError: () => void;
  setBoardSettings: (patch: Partial<BoardSettings>) => void;
}

let unsubscribe: (() => void) | null = null;

export const useGame = create<GameStore>((set, get) => {
  /** Wire up socket messages → store. Idempotent. */
  function ensureSubscribed() {
    if (unsubscribe) return;
    getSocket();
    unsubscribe = onMessage((msg) => {
      if (msg.event === 'joined') {
        const spectator = msg['spectator'] === true;
        set({
          myPlayerId: msg['playerId'] as string,
          roomCode: msg['roomCode'] as string,
          isSpectator: spectator,
          connecting: false,
        });
        // Re-derive the active seat now that we know who we are. A spectator
        // holds no seat, so every control stays inert.
        const s = get().state;
        if (s) {
          set({
            activeSeatId:
              !spectator && s.status === 'in_progress' ? (msg['playerId'] as string) : null,
          });
        }
        return;
      }
      if (msg.event === 'state') {
        const next = msg['state'] as GameState;
        const prev = get().state;
        const diceChanged =
          !!next.dice && JSON.stringify(next.dice) !== JSON.stringify(prev?.dice ?? null);
        const mine = get().isSpectator ? null : get().myPlayerId;
        set({
          state: next,
          error: null,
          activeSeatId: next.status === 'in_progress' ? mine : null,
          rollNonce: diceChanged ? get().rollNonce + 1 : get().rollNonce,
          rolling: diceChanged ? true : get().rolling,
        });
        if (diceChanged) window.setTimeout(() => set({ rolling: false }), 550);
        return;
      }
      if (msg.event === 'error') {
        set({ error: (msg['message'] as string) ?? 'Something went wrong' });
      }
    });
  }

  return {
    state: null,
    mode: 'local',
    activeSeatId: null,
    auctionBidderId: null,
    myPlayerId: null,
    roomCode: null,
    isSpectator: false,
    connecting: false,
    error: null,
    rollNonce: 0,
    rolling: false,
    boardSettings: { textOrientation: 'uniform' },

    start: (players) => {
      const state = createGame(players);
      set({
        state,
        mode: 'local',
        activeSeatId: deriveActiveSeat(state, null),
        auctionBidderId: null,
        myPlayerId: null,
        roomCode: null,
        isSpectator: false,
        error: null,
        rollNonce: 0,
        rolling: false,
      });
    },

    createOnline: async (name, color) => {
      set({ connecting: true, error: null, mode: 'online' });
      try {
        const { roomCode, hostId } = await createRoomRest(name, color);
        set({ myPlayerId: hostId, roomCode });
        ensureSubscribed();
        joinRoom(roomCode, name, color, hostId);
      } catch (err) {
        set({ connecting: false, mode: 'local', error: err instanceof Error ? err.message : 'Could not create room' });
      }
    },

    joinOnline: async (roomCode, name, color) => {
      set({ connecting: true, error: null, mode: 'online', roomCode: roomCode.toUpperCase() });
      ensureSubscribed();
      joinRoom(roomCode.toUpperCase(), name, color);
    },

    startOnline: () => socketSend({ type: 'start_game' }),
    addBotOnline: () => socketSend({ type: 'add_bot' }),

    quit: () => {
      if (get().mode === 'online') {
        disconnectSocket();
        unsubscribe = null;
      }
      set({
        state: null,
        mode: 'local',
        activeSeatId: null,
        auctionBidderId: null,
        myPlayerId: null,
        roomCode: null,
        isSpectator: false,
        connecting: false,
        error: null,
        rolling: false,
      });
    },

    dispatch: (action) => {
      // ── Online: send over the wire; state comes back from the server ─────────
      if (get().mode === 'online') {
        if (get().isSpectator) return; // watching only — the server refuses these anyway
        const wire = toWire(action);
        if (!wire) return;
        socketSend(wire);
        if (action.type === 'roll') {
          set({ rolling: true });
          window.setTimeout(() => set({ rolling: false }), 700);
        }
        return;
      }

      // ── Local (hot-seat): run the pure reducer in-browser ────────────────────
      const prev = get().state;
      if (!prev) return;

      let next: GameState;
      try {
        next = reduce(prev, injectDice(action)).state;
      } catch (err) {
        const message = err instanceof GameRuleError ? err.message : 'Something went wrong';
        set({ error: message });
        return;
      }

      let auctionBidderId = get().auctionBidderId;
      const enteredAuction = prev.turnPhase !== 'auction' && next.turnPhase === 'auction';
      const stillAuction = next.turnPhase === 'auction';

      const actorId = 'playerId' in action ? action.playerId : '';
      if ((enteredAuction || stillAuction) && next.auction) {
        auctionBidderId = nextParticipant(next, actorId, next.auction.participantIds);
      } else {
        auctionBidderId = null;
      }

      const rolled = action.type === 'roll';
      set({
        state: next,
        auctionBidderId,
        activeSeatId: deriveActiveSeat(next, auctionBidderId),
        error: null,
        rollNonce: rolled ? get().rollNonce + 1 : get().rollNonce,
        rolling: rolled,
      });

      if (rolled) window.setTimeout(() => set({ rolling: false }), 550);
    },

    clearError: () => set({ error: null }),

    setBoardSettings: (patch) => set((s) => ({ boardSettings: { ...s.boardSettings, ...patch } })),
  };
});
