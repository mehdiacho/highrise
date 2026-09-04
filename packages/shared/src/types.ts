// ─── Tile ────────────────────────────────────────────────────────────────────

export type TileType =
  | 'start'
  | 'prison'
  | 'vacation'
  | 'go_to_prison'
  | 'city'
  | 'airport'
  | 'utility'
  | 'income_tax'
  | 'luxury_tax'
  | 'surprise'
  | 'treasure';

export type ColorGroup =
  | 'brown'
  | 'lblue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'dblue';

export interface RentTable {
  base: number;
  fullSet: number;
  house1: number;
  house2: number;
  house3: number;
  house4: number;
  hotel: number;
}

export interface Tile {
  position: number; // 0..39
  type: TileType;
  name: string;
  group?: ColorGroup; // cities only
  price?: number;
  buildCost?: number; // per house/hotel
  rents?: RentTable;
  taxAmount?: number; // income_tax / luxury_tax
}

// ─── Card ────────────────────────────────────────────────────────────────────

export type CardEffect =
  | { type: 'pay_bank'; amount: number }
  | { type: 'collect_bank'; amount: number }
  | { type: 'pay_each_player'; amount: number }
  | { type: 'collect_each_player'; amount: number }
  | { type: 'pay_per_building'; perHouse: number; perHotel: number }
  | { type: 'move_to'; tilePosition: number; collectStart: boolean }
  | { type: 'move_relative'; steps: number }
  | { type: 'move_to_nearest'; tileType: 'airport' | 'utility'; rentMultiplier: number }
  | { type: 'go_to_prison' }
  | { type: 'get_out_of_prison_card' };

export interface Card {
  id: string;
  deck: 'surprise' | 'treasure';
  text: string;
  effect: CardEffect;
}

// ─── Player ──────────────────────────────────────────────────────────────────

export interface Jail {
  inJail: boolean;
  turnsServed: number; // 0..3 — turn you entered counts as 0
  getOutCards: number;
}

/**
 * Who is driving a seat.
 * - `human`  — a person (hot-seat now, networked client later)
 * - `bot`    — deterministic pre-written policy (`bot.ts`), no model call
 * - `ai`     — a live model reasoning over full board context in real time
 *
 * `isBot` stays true for both `bot` and `ai` so existing auto-play / turn-skip
 * paths keep working; `kind` carries the distinction the UI and AI driver need.
 */
export type PlayerKind = 'human' | 'bot' | 'ai';

export interface Player {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  /** Optional for back-compat; falls back to isBot when absent. */
  kind?: PlayerKind;
  isHost: boolean;

  position: number; // 0..39
  cash: number;
  properties: number[]; // tile positions

  jail: Jail;
  bankrupt: boolean;
  disconnected: boolean;
}

// ─── Auction ─────────────────────────────────────────────────────────────────

export interface Auction {
  tilePosition: number;
  currentBid: number;
  currentBidderId: string | null;
  participantIds: string[]; // players still active in the auction
  passedIds: string[]; // players who passed
  startedByPlayerId: string; // player who declined and triggered the auction
}

// ─── Trade ───────────────────────────────────────────────────────────────────

export interface TradeAssets {
  cash: number;
  properties: number[]; // tile positions
  jailCards: number;
}

export interface TradeOffer {
  id: string;
  fromId: string;
  toId: string;
  offer: TradeAssets; // what fromId gives
  demand: TradeAssets; // what fromId receives
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
}

// ─── Game events (append-only log) ───────────────────────────────────────────

export type GameEvent =
  | { type: 'rolled'; playerId: string; dice: [number, number]; doubles: boolean }
  | { type: 'moved'; playerId: string; from: number; to: number }
  | { type: 'passed_start'; playerId: string; amount: number }
  | { type: 'bought'; playerId: string; tilePosition: number; price: number }
  | { type: 'rent_paid'; payerId: string; ownerId: string; tilePosition: number; amount: number }
  | { type: 'tax_paid'; playerId: string; tilePosition: number; amount: number }
  | { type: 'card_drawn'; playerId: string; deck: 'surprise' | 'treasure'; cardId: string }
  | { type: 'auction_started'; tilePosition: number; startedByPlayerId: string }
  | { type: 'auction_bid'; playerId: string; amount: number }
  | { type: 'auction_won'; playerId: string; tilePosition: number; amount: number }
  | { type: 'auction_no_winner'; tilePosition: number }
  | { type: 'built'; playerId: string; tilePosition: number; buildings: number }
  | { type: 'sold_building'; playerId: string; tilePosition: number; buildings: number }
  | { type: 'mortgaged'; playerId: string; tilePosition: number; received: number }
  | { type: 'unmortgaged'; playerId: string; tilePosition: number; paid: number }
  | { type: 'sent_to_prison'; playerId: string; reason: 'triple_doubles' | 'card' | 'tile' }
  | { type: 'released_from_prison'; playerId: string; reason: 'fine' | 'card' | 'doubles' }
  | { type: 'trade_proposed'; fromId: string; toId: string; tradeId: string }
  | { type: 'trade_accepted'; tradeId: string }
  | { type: 'trade_rejected'; tradeId: string }
  | { type: 'bankrupt'; playerId: string; creditorId: string | null }
  | { type: 'game_over'; winnerId: string };

// ─── Game state ───────────────────────────────────────────────────────────────

export type TurnPhase = 'pre_roll' | 'rolled' | 'post_action' | 'auction' | 'trade';
export type GameStatus = 'lobby' | 'in_progress' | 'finished';

export interface GameSettings {
  startingCash: number; // 1500
  passStartBonus: number; // 200
  maxPlayers: number; // 2..4 (base), up to 8 paid
  turnTimeoutSeconds: number;
  mapId: string;
  allowAuction: boolean;
  doublesToJail: number; // 3
  maxJailTurns: number; // 3
  jailFine: number; // 50
}

export interface GameState {
  roomCode: string;
  status: GameStatus;
  settings: GameSettings;

  players: Player[];
  currentPlayerIndex: number;
  turnPhase: TurnPhase;

  dice: [number, number] | null;
  doublesStreak: number; // 0..2; 3rd double triggers jail before move

  board: Tile[]; // 40 tiles, static per map
  ownership: Record<number, string | null>; // tilePos → playerId
  buildings: Record<number, number>; // tilePos → 0..5 (5 = hotel)
  mortgaged: Record<number, boolean>;

  surpriseDeck: Card[];
  treasureDeck: Card[];
  surpriseDiscard: Card[];
  treasureDiscard: Card[];

  auction: Auction | null;
  trades: TradeOffer[];
  log: GameEvent[];

  // Pending prompt: set when the current player must make a decision
  pendingBuy: number | null; // tilePosition awaiting buy/decline
}

// ─── Actions ─────────────────────────────────────────────────────────────────

export type Action =
  | { type: 'start_game'; playerId: string }
  | { type: 'add_bot' }
  | { type: 'roll'; playerId: string; dice: [number, number] }
  | { type: 'buy'; playerId: string }
  | { type: 'decline'; playerId: string }
  | { type: 'bid'; playerId: string; increment: 2 | 10 | 100 }
  | { type: 'pass_auction'; playerId: string }
  | { type: 'end_turn'; playerId: string }
  | { type: 'mortgage'; playerId: string; tilePosition: number }
  | { type: 'unmortgage'; playerId: string; tilePosition: number }
  | { type: 'build'; playerId: string; tilePosition: number }
  | { type: 'sell_building'; playerId: string; tilePosition: number }
  | { type: 'trade_create'; playerId: string; toId: string; offer: TradeAssets; demand: TradeAssets }
  | { type: 'trade_respond'; playerId: string; tradeId: string; action: 'accept' | 'reject' }
  | { type: 'pay_jail_fine'; playerId: string }
  | { type: 'use_jail_card'; playerId: string }
  | { type: 'declare_bankrupt'; playerId: string };
