import type { GameState, GameSettings, Player, PlayerKind, Card, Action } from '@richup/shared/types';
import { reduce } from '@richup/shared/engine/reduce';
import mapData from '@richup/shared/data/default-map';

/** A seat filled in at the setup screen. */
export interface SetupPlayer {
  name: string;
  color: string;
  kind: PlayerKind;
}

export const MAX_PLAYERS = 12;

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  passStartBonus: 200,
  maxPlayers: MAX_PLAYERS,
  turnTimeoutSeconds: 120,
  mapId: 'default',
  allowAuction: true,
  doublesToJail: 3,
  maxJailTurns: 3,
  jailFine: 50,
};

// ─── Local IO (the server's job, done in-browser for hot-seat) ────────────────

/** Non-deterministic 2d6, mirroring the server's io/random.ts. */
export function rollDice(): [number, number] {
  return [Math.ceil(Math.random() * 6), Math.ceil(Math.random() * 6)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/**
 * The only randomness the engine consumes is the dice on a roll (cards are drawn
 * from the pre-shuffled deck inside the reducer). Mirror the server's dispatch:
 * inject dice, then hand a fully-specified action to the pure reducer.
 */
export function injectDice(action: Action): Action {
  return action.type === 'roll' ? { ...action, dice: rollDice() } : action;
}

let idSeq = 0;
function playerId(): string {
  return `p_${(idSeq++).toString(36)}${Math.random().toString(36).slice(2, 4)}`;
}

/**
 * Build a fresh in-progress game from the setup screen. Replicates the server's
 * room factory (board + shuffled decks) then runs the pure `start_game` action,
 * so the resulting state is identical in shape to a networked game.
 */
export function createGame(setup: SetupPlayer[], settings?: Partial<GameSettings>): GameState {
  const gameSettings: GameSettings = {
    ...DEFAULT_SETTINGS,
    maxPlayers: Math.max(setup.length, 2),
    ...settings,
  };

  const players: Player[] = setup.map((sp, i) => ({
    id: playerId(),
    name: (sp.name.trim() || `Player ${i + 1}`).slice(0, 24),
    color: sp.color,
    isBot: sp.kind !== 'human',
    kind: sp.kind,
    isHost: i === 0,
    position: 0,
    cash: gameSettings.startingCash,
    properties: [],
    jail: { inJail: false, turnsServed: 0, getOutCards: 0 },
    bankrupt: false,
    disconnected: false,
  }));

  const lobby: GameState = {
    roomCode: 'LOCAL',
    status: 'lobby',
    settings: gameSettings,
    players,
    currentPlayerIndex: 0,
    turnPhase: 'pre_roll',
    dice: null,
    doublesStreak: 0,
    board: mapData.tiles as GameState['board'],
    ownership: {},
    buildings: {},
    mortgaged: {},
    surpriseDeck: shuffle(mapData.surpriseDeck as unknown as Card[]),
    treasureDeck: shuffle(mapData.treasureDeck as unknown as Card[]),
    surpriseDiscard: [],
    treasureDiscard: [],
    auction: null,
    trades: [],
    log: [],
    pendingBuy: null,
  };

  return reduce(lobby, { type: 'start_game', playerId: players[0]!.id }).state;
}
