import type { GameState, GameSettings, Player, Card } from '@richup/shared/types';
import { shuffleArray, generateRoomCode } from './io/random.js';
import mapData from '@richup/shared/data/default-map' with { type: 'json' };

const BOT_NAMES = ['RoboMax', 'CyberAce', 'MegaBot', 'ProdigyAI', 'NexusBot'];
const BOT_COLORS = ['#e74c3c', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c'];

export interface RoomRuntime {
  state: GameState;
  // Timer handles for bot turns and auction timeouts
  botTimer: ReturnType<typeof setTimeout> | null;
}

const rooms = new Map<string, RoomRuntime>();

export function createRoom(hostId: string, hostName: string, hostColor: string, settings?: Partial<GameSettings>): { roomCode: string; state: GameState } {
  const roomCode = generateRoomCode();

  const host: Player = {
    id: hostId,
    name: hostName.slice(0, 24),
    color: hostColor || '#3498db',
    isBot: false,
    isHost: true,
    position: 0,
    cash: 1500,
    properties: [],
    jail: { inJail: false, turnsServed: 0, getOutCards: 0 },
    bankrupt: false,
    disconnected: false,
  };

  const gameSettings: GameSettings = {
    startingCash: 1500,
    passStartBonus: 200,
    maxPlayers: 12,
    turnTimeoutSeconds: 120,
    mapId: 'default',
    allowAuction: true,
    doublesToJail: 3,
    maxJailTurns: 3,
    jailFine: 50,
    ...settings,
  };

  const surpriseDeck = shuffleArray(mapData.surpriseDeck as unknown as Card[]);
  const treasureDeck = shuffleArray(mapData.treasureDeck as unknown as Card[]);

  const state: GameState = {
    roomCode,
    status: 'lobby',
    settings: gameSettings,
    players: [host],
    currentPlayerIndex: 0,
    turnPhase: 'pre_roll',
    dice: null,
    doublesStreak: 0,
    board: mapData.tiles as GameState['board'],
    ownership: {},
    buildings: {},
    mortgaged: {},
    surpriseDeck,
    treasureDeck,
    surpriseDiscard: [],
    treasureDiscard: [],
    auction: null,
    trades: [],
    log: [],
    pendingBuy: null,
  };

  rooms.set(roomCode, { state, botTimer: null });
  return { roomCode, state };
}

export function getRoom(roomCode: string): RoomRuntime | undefined {
  return rooms.get(roomCode);
}

export function setRoomState(roomCode: string, state: GameState): void {
  const room = rooms.get(roomCode);
  if (room) room.state = state;
}

export function addPlayerToRoom(roomCode: string, playerId: string, name: string, color: string): Player | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.state.status !== 'lobby') return null;
  if (room.state.players.length >= room.state.settings.maxPlayers) return null;

  const player: Player = {
    id: playerId,
    name: name.slice(0, 24),
    color,
    isBot: false,
    isHost: false,
    position: 0,
    cash: room.state.settings.startingCash,
    properties: [],
    jail: { inJail: false, turnsServed: 0, getOutCards: 0 },
    bankrupt: false,
    disconnected: false,
  };

  room.state = { ...room.state, players: [...room.state.players, player] };
  return player;
}

export function addBotToRoom(roomCode: string): Player | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.state.status !== 'lobby') return null;
  if (room.state.players.length >= room.state.settings.maxPlayers) return null;

  const botIndex = room.state.players.filter((p) => p.isBot).length;
  const bot: Player = {
    id: `bot_${Math.random().toString(36).slice(2, 6)}`,
    name: BOT_NAMES[botIndex % BOT_NAMES.length] ?? 'Bot',
    color: BOT_COLORS[botIndex % BOT_COLORS.length] ?? '#888888',
    isBot: true,
    isHost: false,
    position: 0,
    cash: room.state.settings.startingCash,
    properties: [],
    jail: { inJail: false, turnsServed: 0, getOutCards: 0 },
    bankrupt: false,
    disconnected: false,
  };

  room.state = { ...room.state, players: [...room.state.players, bot] };
  return bot;
}

export function removeRoom(roomCode: string): void {
  const room = rooms.get(roomCode);
  if (room?.botTimer) clearTimeout(room.botTimer);
  rooms.delete(roomCode);
}

export function listRooms(): { roomCode: string; playerCount: number; status: string }[] {
  return [...rooms.entries()].map(([code, room]) => ({
    roomCode: code,
    playerCount: room.state.players.length,
    status: room.state.status,
  }));
}
