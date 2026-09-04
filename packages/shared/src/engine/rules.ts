import type { GameState, Player, Tile, ColorGroup } from '../types.js';

// ─── Mortgage math ───────────────────────────────────────────────────────────

export function mortgageValue(price: number): number {
  return Math.floor(price / 2);
}

export function unmortgageCost(mv: number): number {
  return Math.round(mv * 1.1);
}

// ─── Tile queries ────────────────────────────────────────────────────────────

export function tileAt(state: GameState, position: number): Tile {
  const tile = state.board[position];
  if (!tile) throw new Error(`No tile at position ${position}`);
  return tile;
}

export function airportPositions(state: GameState): number[] {
  return state.board.filter((t) => t.type === 'airport').map((t) => t.position);
}

export function utilityPositions(state: GameState): number[] {
  return state.board.filter((t) => t.type === 'utility').map((t) => t.position);
}

export function groupTiles(state: GameState, group: ColorGroup): Tile[] {
  return state.board.filter((t) => t.group === group);
}

export function ownsFullGroup(state: GameState, playerId: string, group: ColorGroup): boolean {
  return groupTiles(state, group).every((t) => state.ownership[t.position] === playerId);
}

// ─── Rent calculation ────────────────────────────────────────────────────────

export function calcRent(
  state: GameState,
  tile: Tile,
  ownerId: string,
  diceTotal: number,
): number {
  if (state.mortgaged[tile.position]) return 0;

  if (tile.type === 'airport') {
    const count = airportPositions(state).filter((p) => state.ownership[p] === ownerId).length;
    return [0, 25, 50, 100, 200][count] ?? 0;
  }

  if (tile.type === 'utility') {
    const count = utilityPositions(state).filter((p) => state.ownership[p] === ownerId).length;
    return diceTotal * (count >= 2 ? 10 : 4);
  }

  if (tile.type === 'city' && tile.rents && tile.group) {
    const buildings = state.buildings[tile.position] ?? 0;
    if (buildings === 0) {
      return ownsFullGroup(state, ownerId, tile.group)
        ? tile.rents.fullSet
        : tile.rents.base;
    }
    const byBuilding: Record<number, keyof typeof tile.rents> = {
      1: 'house1',
      2: 'house2',
      3: 'house3',
      4: 'house4',
      5: 'hotel',
    };
    const key = byBuilding[buildings];
    return key ? tile.rents[key] : tile.rents.base;
  }

  return 0;
}

// ─── Building legality ───────────────────────────────────────────────────────

export function canBuild(state: GameState, playerId: string, tilePosition: number): boolean {
  const tile = tileAt(state, tilePosition);
  if (tile.type !== 'city' || !tile.group || !tile.buildCost) return false;
  if (state.ownership[tilePosition] !== playerId) return false;
  if (!ownsFullGroup(state, playerId, tile.group)) return false;

  const group = groupTiles(state, tile.group);

  // No mortgaged properties in the group
  if (group.some((t) => state.mortgaged[t.position])) return false;

  const current = state.buildings[tilePosition] ?? 0;
  if (current >= 5) return false; // hotel is max

  // Evenness: can't place if this property already has as many as the min in group
  const minBuildings = Math.min(...group.map((t) => state.buildings[t.position] ?? 0));
  return current <= minBuildings;
}

export function canSellBuilding(
  state: GameState,
  playerId: string,
  tilePosition: number,
): boolean {
  const tile = tileAt(state, tilePosition);
  if (tile.type !== 'city' || !tile.group) return false;
  if (state.ownership[tilePosition] !== playerId) return false;

  const current = state.buildings[tilePosition] ?? 0;
  if (current <= 0) return false;

  // Evenness: can't sell below the group min already
  const group = groupTiles(state, tile.group);
  const maxBuildings = Math.max(...group.map((t) => state.buildings[t.position] ?? 0));
  return current >= maxBuildings;
}

// ─── Mortgage legality ───────────────────────────────────────────────────────

export function canMortgage(state: GameState, playerId: string, tilePosition: number): boolean {
  const tile = tileAt(state, tilePosition);
  if (!['city', 'airport', 'utility'].includes(tile.type)) return false;
  if (state.ownership[tilePosition] !== playerId) return false;
  if (state.mortgaged[tilePosition]) return false;

  // Must sell all buildings in the group first
  if (tile.type === 'city' && tile.group) {
    const group = groupTiles(state, tile.group);
    if (group.some((t) => (state.buildings[t.position] ?? 0) > 0)) return false;
  }

  return true;
}

export function canUnmortgage(state: GameState, playerId: string, tilePosition: number): boolean {
  const tile = tileAt(state, tilePosition);
  if (state.ownership[tilePosition] !== playerId) return false;
  if (!state.mortgaged[tilePosition]) return false;

  const tile_ = tile as Tile & { price: number };
  if (!tile_.price) return false;
  const cost = unmortgageCost(mortgageValue(tile_.price));
  const player = state.players.find((p) => p.id === playerId);
  return (player?.cash ?? 0) >= cost;
}

// ─── Net worth ────────────────────────────────────────────────────────────────

export function netWorth(player: Player, state: GameState): number {
  let worth = player.cash;
  for (const pos of player.properties) {
    const tile = tileAt(state, pos);
    if (tile.type === 'city' && tile.price && tile.buildCost) {
      if (!state.mortgaged[pos]) {
        worth += mortgageValue(tile.price);
      }
      const buildings = state.buildings[pos] ?? 0;
      worth += buildings * Math.floor(tile.buildCost / 2);
    } else if ((tile.type === 'airport' || tile.type === 'utility') && tile.price) {
      if (!state.mortgaged[pos]) {
        worth += mortgageValue(tile.price);
      }
    }
  }
  return worth;
}

// ─── Bankruptcy check ─────────────────────────────────────────────────────────

export function canAfford(player: Player, state: GameState, amount: number): boolean {
  return netWorth(player, state) >= amount;
}

export function liquidationValue(player: Player, state: GameState): number {
  return netWorth(player, state);
}

// ─── Position math ────────────────────────────────────────────────────────────

export const BOARD_SIZE = 40;

export function advancePosition(current: number, steps: number): number {
  return ((current + steps) % BOARD_SIZE + BOARD_SIZE) % BOARD_SIZE;
}

export function passedStart(from: number, to: number): boolean {
  if (from === to) return false;
  return to < from; // wrapped clockwise past position 0
}

export function nearestTile(
  current: number,
  positions: number[],
): number {
  let best = -1;
  let bestDist = 999;
  for (const pos of positions) {
    const dist = (pos - current + BOARD_SIZE) % BOARD_SIZE;
    if (dist > 0 && dist < bestDist) {
      bestDist = dist;
      best = pos;
    }
  }
  return best === -1 ? positions[0]! : best;
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateTradeId(): string {
  return `tr_${Math.random().toString(36).slice(2, 7)}`;
}

export class GameRuleError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'GameRuleError';
  }
}
