import type { GameState, Player, GameSettings } from '../types.js';
import mapData from '../data/default-map.json' assert { type: 'json' };

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    color: '#ff0000',
    isBot: false,
    isHost: id === 'p1',
    position: 0,
    cash: 1500,
    properties: [],
    jail: { inJail: false, turnsServed: 0, getOutCards: 0 },
    bankrupt: false,
    disconnected: false,
    ...overrides,
  };
}

export const DEFAULT_SETTINGS: GameSettings = {
  startingCash: 1500,
  passStartBonus: 200,
  maxPlayers: 4,
  turnTimeoutSeconds: 60,
  mapId: 'default',
  allowAuction: true,
  doublesToJail: 3,
  maxJailTurns: 3,
  jailFine: 50,
};

export function makeState(overrides: Partial<GameState> = {}, players?: Player[]): GameState {
  const ps = players ?? [makePlayer('p1'), makePlayer('p2')];
  return {
    roomCode: 'test1',
    status: 'in_progress',
    settings: DEFAULT_SETTINGS,
    players: ps,
    currentPlayerIndex: 0,
    turnPhase: 'pre_roll',
    dice: null,
    doublesStreak: 0,
    board: mapData.tiles as GameState['board'],
    ownership: {},
    buildings: {},
    mortgaged: {},
    surpriseDeck: mapData.surpriseDeck as GameState['surpriseDeck'],
    treasureDeck: mapData.treasureDeck as GameState['treasureDeck'],
    surpriseDiscard: [],
    treasureDiscard: [],
    auction: null,
    trades: [],
    log: [],
    pendingBuy: null,
    ...overrides,
  };
}

/** Roll action using a fixed dice value */
export function roll(playerId: string, d1: number, d2: number) {
  return { type: 'roll' as const, playerId, dice: [d1, d2] as [number, number] };
}
