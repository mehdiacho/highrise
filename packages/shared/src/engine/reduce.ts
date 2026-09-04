import type { GameState, Action, GameEvent, Player, Card, Tile } from '../types.js';
import {
  tileAt,
  calcRent,
  canBuild,
  canSellBuilding,
  canMortgage,
  canUnmortgage,
  mortgageValue,
  unmortgageCost,
  airportPositions,
  utilityPositions,
  nearestTile,
  advancePosition,
  passedStart,
  netWorth,
  generateTradeId,
  BOARD_SIZE,
  GameRuleError,
} from './rules.js';

export { GameRuleError };

export type ReduceResult = { state: GameState; events: GameEvent[] };

// ─── Helpers ─────────────────────────────────────────────────────────────────

function assertPhase(state: GameState, ...phases: GameState['turnPhase'][]): void {
  if (!phases.includes(state.turnPhase)) {
    throw new GameRuleError(
      `Action not allowed in phase "${state.turnPhase}"`,
      'WRONG_PHASE',
    );
  }
}

function assertCurrentPlayer(state: GameState, playerId: string): void {
  const current = state.players[state.currentPlayerIndex];
  if (!current || current.id !== playerId) {
    throw new GameRuleError('Not your turn', 'NOT_YOUR_TURN');
  }
}

function currentPlayer(state: GameState): Player {
  const p = state.players[state.currentPlayerIndex];
  if (!p) throw new GameRuleError('No current player', 'NO_CURRENT_PLAYER');
  return p;
}

function updatePlayer(state: GameState, playerId: string, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((p) => (p.id === playerId ? { ...p, ...patch } : p)),
  };
}

function drawCard(state: GameState, deck: 'surprise' | 'treasure'): { state: GameState; card: Card } {
  const deckKey = deck === 'surprise' ? 'surpriseDeck' : 'treasureDeck';
  const discardKey = deck === 'surprise' ? 'surpriseDiscard' : 'treasureDiscard';

  let currentDeck = state[deckKey];
  let discard = state[discardKey];

  if (currentDeck.length === 0) {
    // Reshuffle discard — order preserved (server shuffled at game start; here we just restore)
    currentDeck = [...discard];
    discard = [];
  }

  const card = currentDeck[0]!;
  return {
    state: {
      ...state,
      [deckKey]: currentDeck.slice(1),
      [discardKey]: deck === 'surprise'
        ? [...discard, card]
        : [...discard, card],
    },
    card,
  };
}

function sendToJail(state: GameState, playerId: string, reason: 'triple_doubles' | 'card' | 'tile'): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [{ type: 'sent_to_prison', playerId, reason }];
  let s = updatePlayer(state, playerId, {
    position: 10, // Prison tile
    jail: { inJail: true, turnsServed: 0, getOutCards: state.players.find(p => p.id === playerId)?.jail.getOutCards ?? 0 },
  });
  s = { ...s, doublesStreak: 0 };
  return { state: s, events };
}

function payPlayer(state: GameState, fromId: string, toId: string | null, amount: number): GameState {
  return {
    ...state,
    players: state.players.map((p) => {
      if (p.id === fromId) return { ...p, cash: p.cash - amount };
      if (toId && p.id === toId) return { ...p, cash: p.cash + amount };
      return p;
    }),
  };
}

function movePlayer(
  state: GameState,
  playerId: string,
  targetPos: number,
  collectStartIfPassed: boolean,
): { state: GameState; events: GameEvent[] } {
  const player = state.players.find((p) => p.id === playerId)!;
  const from = player.position;
  const events: GameEvent[] = [{ type: 'moved', playerId, from, to: targetPos }];

  let s = updatePlayer(state, playerId, { position: targetPos });

  if (collectStartIfPassed && passedStart(from, targetPos)) {
    const bonus = state.settings.passStartBonus;
    s = payPlayer(s, 'bank', playerId, bonus);
    events.push({ type: 'passed_start', playerId, amount: bonus });
  }

  return { state: s, events };
}

function resolveTile(state: GameState, playerId: string, diceTotal: number): ReduceResult {
  const player = state.players.find((p) => p.id === playerId)!;
  const tile = tileAt(state, player.position);
  const events: GameEvent[] = [];
  let s = state;

  switch (tile.type) {
    case 'start':
    case 'vacation':
    case 'prison':
      // Landing on Start: passStartBonus already paid by movePlayer (passedStart check).
      // Vacation and Prison: no effect.
      s = { ...s, turnPhase: 'post_action' };
      break;

    case 'go_to_prison': {
      const result = sendToJail(s, playerId, 'tile');
      s = { ...result.state, turnPhase: 'post_action', doublesStreak: 0 };
      events.push(...result.events);
      break;
    }

    case 'income_tax':
    case 'luxury_tax': {
      const amount = tile.taxAmount ?? 0;
      s = payPlayer(s, playerId, null, amount);
      s = { ...s, turnPhase: 'post_action' };
      events.push({ type: 'tax_paid', playerId, tilePosition: tile.position, amount });
      break;
    }

    case 'surprise':
    case 'treasure': {
      const deck = tile.type === 'surprise' ? 'surprise' : 'treasure';
      const { state: s2, card } = drawCard(s, deck);
      s = s2;
      events.push({ type: 'card_drawn', playerId, deck, cardId: card.id });
      const cardResult = applyCardEffect(s, playerId, card, diceTotal);
      s = cardResult.state;
      events.push(...cardResult.events);
      break;
    }

    case 'city':
    case 'airport':
    case 'utility': {
      const ownerId = s.ownership[tile.position] ?? null;

      if (!ownerId) {
        // Unowned — prompt to buy or auction
        s = { ...s, turnPhase: 'rolled', pendingBuy: tile.position };
      } else if (ownerId === playerId) {
        // Own it — nothing
        s = { ...s, turnPhase: 'post_action' };
      } else if (s.mortgaged[tile.position]) {
        // Mortgaged — no rent
        s = { ...s, turnPhase: 'post_action' };
      } else {
        // Pay rent
        const owner = s.players.find((p) => p.id === ownerId);
        if (owner && !owner.bankrupt) {
          const rent = calcRent(s, tile, ownerId, diceTotal);
          if (rent > 0) {
            s = payPlayer(s, playerId, ownerId, rent);
            events.push({ type: 'rent_paid', payerId: playerId, ownerId, tilePosition: tile.position, amount: rent });
          }
        }
        s = { ...s, turnPhase: 'post_action' };
      }
      break;
    }

    default:
      s = { ...s, turnPhase: 'post_action' };
  }

  return { state: s, events };
}

function applyCardEffect(
  state: GameState,
  playerId: string,
  card: Card,
  diceTotal: number,
): ReduceResult {
  const events: GameEvent[] = [];
  let s = state;
  const effect = card.effect;

  switch (effect.type) {
    case 'pay_bank':
      s = payPlayer(s, playerId, null, effect.amount);
      break;

    case 'collect_bank':
      s = payPlayer(s, 'bank', playerId, effect.amount);
      break;

    case 'pay_each_player': {
      const others = s.players.filter((p) => p.id !== playerId && !p.bankrupt);
      for (const other of others) {
        s = payPlayer(s, playerId, other.id, effect.amount);
      }
      break;
    }

    case 'collect_each_player': {
      const others = s.players.filter((p) => p.id !== playerId && !p.bankrupt);
      for (const other of others) {
        s = payPlayer(s, other.id, playerId, effect.amount);
      }
      break;
    }

    case 'pay_per_building': {
      const player = s.players.find((p) => p.id === playerId)!;
      let total = 0;
      for (const pos of player.properties) {
        const b = s.buildings[pos] ?? 0;
        if (b === 5) total += effect.perHotel;
        else total += b * effect.perHouse;
      }
      if (total > 0) s = payPlayer(s, playerId, null, total);
      break;
    }

    case 'move_to': {
      const result = movePlayer(s, playerId, effect.tilePosition, effect.collectStart);
      s = result.state;
      events.push(...result.events);
      const tileResult = resolveTile(s, playerId, diceTotal);
      s = tileResult.state;
      events.push(...tileResult.events);
      break;
    }

    case 'move_relative': {
      const player = s.players.find((p) => p.id === playerId)!;
      const newPos = advancePosition(player.position, effect.steps);
      const result = movePlayer(s, playerId, newPos, effect.steps > 0);
      s = result.state;
      events.push(...result.events);
      const tileResult = resolveTile(s, playerId, diceTotal);
      s = tileResult.state;
      events.push(...tileResult.events);
      break;
    }

    case 'move_to_nearest': {
      const player = s.players.find((p) => p.id === playerId)!;
      const positions = effect.tileType === 'airport'
        ? airportPositions(s)
        : utilityPositions(s);
      const nearest = nearestTile(player.position, positions);
      const result = movePlayer(s, playerId, nearest, true);
      s = result.state;
      events.push(...result.events);

      const ownerId = s.ownership[nearest] ?? null;
      if (ownerId && ownerId !== playerId && !s.mortgaged[nearest]) {
        const tile = tileAt(s, nearest);
        const baseRent = calcRent(s, tile, ownerId, diceTotal);
        const rent = Math.round(baseRent * effect.rentMultiplier);
        if (rent > 0) {
          s = payPlayer(s, playerId, ownerId, rent);
          events.push({ type: 'rent_paid', payerId: playerId, ownerId, tilePosition: nearest, amount: rent });
        }
        s = { ...s, turnPhase: 'post_action' };
      } else {
        const tileResult = resolveTile(s, playerId, diceTotal);
        s = tileResult.state;
        events.push(...tileResult.events);
      }
      break;
    }

    case 'go_to_prison': {
      const result = sendToJail(s, playerId, 'card');
      s = { ...result.state, turnPhase: 'post_action' };
      events.push(...result.events);
      break;
    }

    case 'get_out_of_prison_card': {
      const player = s.players.find((p) => p.id === playerId)!;
      s = updatePlayer(s, playerId, {
        jail: { ...player.jail, getOutCards: player.jail.getOutCards + 1 },
      });
      s = { ...s, turnPhase: 'post_action' };
      break;
    }
  }

  return { state: s, events };
}

function nextSolventPlayer(state: GameState): number {
  const count = state.players.length;
  let idx = (state.currentPlayerIndex + 1) % count;
  let checked = 0;
  while (checked < count) {
    const p = state.players[idx];
    if (p && !p.bankrupt) return idx;
    idx = (idx + 1) % count;
    checked++;
  }
  return state.currentPlayerIndex;
}

// ─── Transfer bankruptcy assets ───────────────────────────────────────────────

function transferBankrupt(state: GameState, player: Player, creditorId: string | null): GameState {
  let s = state;

  // Sell all buildings on player's properties — bank keeps the cash (no refund to bankrupt player)
  for (const pos of player.properties) {
    const buildings = s.buildings[pos] ?? 0;
    if (buildings > 0) {
      const tile = tileAt(s, pos) as Tile & { buildCost?: number };
      const refund = buildings * Math.floor((tile.buildCost ?? 0) / 2);
      if (creditorId) {
        s = payPlayer(s, 'bank', creditorId, refund);
      }
      s = { ...s, buildings: { ...s.buildings, [pos]: 0 } };
    }
  }

  if (creditorId) {
    // Transfer properties to creditor
    const creditor = s.players.find((p) => p.id === creditorId)!;
    s = updatePlayer(s, creditorId, {
      properties: [...creditor.properties, ...player.properties],
    });
    const newOwnership = { ...s.ownership };
    for (const pos of player.properties) {
      newOwnership[pos] = creditorId;
    }
    s = { ...s, ownership: newOwnership };
  } else {
    // Bank takes back — start auction for each property
    const newOwnership = { ...s.ownership };
    for (const pos of player.properties) {
      newOwnership[pos] = null;
      s = { ...s, mortgaged: { ...s.mortgaged, [pos]: false } };
    }
    s = { ...s, ownership: newOwnership };
  }

  // Remove player from the game
  s = updatePlayer(s, player.id, { bankrupt: true, properties: [] });

  return s;
}

function checkGameOver(state: GameState): ReduceResult {
  const solvent = state.players.filter((p) => !p.bankrupt);
  if (solvent.length <= 1) {
    const winner = solvent[0];
    const events: GameEvent[] = winner
      ? [{ type: 'game_over', winnerId: winner.id }]
      : [];
    return { state: { ...state, status: 'finished' }, events };
  }
  return { state, events: [] };
}

// ─── Main reducer ─────────────────────────────────────────────────────────────

/** Most recent events kept on state.log — bounds the size of each state broadcast. */
const LOG_LIMIT = 200;

/**
 * Appends this action's events to `state.log` so clients that mirror the state
 * get the game log for free. Stays pure: no IO, no clock, no randomness.
 */
export function reduce(state: GameState, action: Action): ReduceResult {
  const result = reduceInner(state, action);
  if (result.events.length === 0) return result;

  const log = [...result.state.log, ...result.events];
  return {
    state: { ...result.state, log: log.slice(-LOG_LIMIT) },
    events: result.events,
  };
}

function reduceInner(state: GameState, action: Action): ReduceResult {
  if (state.status === 'finished') {
    throw new GameRuleError('Game is over', 'GAME_OVER');
  }

  switch (action.type) {

    // ── Start game ──────────────────────────────────────────────────────────
    case 'start_game': {
      if (state.status !== 'lobby') throw new GameRuleError('Game already started', 'ALREADY_STARTED');
      const host = state.players.find((p) => p.id === action.playerId);
      if (!host?.isHost) throw new GameRuleError('Only the host can start', 'NOT_HOST');
      if (state.players.length < 2) throw new GameRuleError('Need at least 2 players', 'TOO_FEW_PLAYERS');
      return { state: { ...state, status: 'in_progress' }, events: [] };
    }

    // ── Add bot ─────────────────────────────────────────────────────────────
    case 'add_bot': {
      // Server handles this; reducer just validates
      if (state.status !== 'lobby') throw new GameRuleError('Cannot add bots after game starts', 'WRONG_PHASE');
      return { state, events: [] };
    }

    // ── Roll ────────────────────────────────────────────────────────────────
    case 'roll': {
      if (state.status !== 'in_progress') throw new GameRuleError('Game not started', 'NOT_STARTED');
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'pre_roll');

      const player = currentPlayer(state);
      const [d1, d2] = action.dice;
      const total = d1 + d2;
      const isDoubles = d1 === d2;
      const events: GameEvent[] = [{ type: 'rolled', playerId: action.playerId, dice: action.dice, doubles: isDoubles }];

      // ── In-jail handling ──
      if (player.jail.inJail) {
        if (isDoubles) {
          // Escape with doubles
          let s = updatePlayer(state, player.id, {
            jail: { inJail: false, turnsServed: 0, getOutCards: player.jail.getOutCards },
          });
          s = { ...s, doublesStreak: 0 }; // doubles-from-jail don't chain
          events.push({ type: 'released_from_prison', playerId: player.id, reason: 'doubles' });
          const moveResult = movePlayer(s, player.id, advancePosition(player.position, total), true);
          s = moveResult.state;
          events.push(...moveResult.events);
          const tileResult = resolveTile(s, player.id, total);
          s = tileResult.state;
          events.push(...tileResult.events);
          s = { ...s, dice: action.dice };
          return { state: s, events };
        }

        // Served 3 turns — must pay fine and move
        if (player.jail.turnsServed >= state.settings.maxJailTurns - 1) {
          const fine = state.settings.jailFine;
          let s = payPlayer(state, player.id, null, fine);
          s = updatePlayer(s, player.id, {
            jail: { inJail: false, turnsServed: 0, getOutCards: player.jail.getOutCards },
          });
          events.push({ type: 'released_from_prison', playerId: player.id, reason: 'fine' });
          const moveResult = movePlayer(s, player.id, advancePosition(player.position, total), true);
          s = moveResult.state;
          events.push(...moveResult.events);
          const tileResult = resolveTile(s, player.id, total);
          s = tileResult.state;
          events.push(...tileResult.events);
          s = { ...s, dice: action.dice };
          return { state: s, events };
        }

        // Stuck in jail another turn
        const turnsServed = player.jail.turnsServed + 1;
        let s = updatePlayer(state, player.id, {
          jail: { ...player.jail, turnsServed },
        });
        s = { ...s, dice: action.dice, turnPhase: 'post_action' };
        return { state: s, events };
      }

      // ── Normal roll ──
      const newStreak = isDoubles ? (state.doublesStreak + 1) : 0;

      if (newStreak >= state.settings.doublesToJail) {
        // Third double → jail, don't move
        let s: GameState = { ...state, doublesStreak: 0, dice: action.dice };
        const jailResult = sendToJail(s, player.id, 'triple_doubles');
        s = { ...jailResult.state, turnPhase: 'post_action' };
        events.push(...jailResult.events);
        return { state: s, events };
      }

      let s: GameState = { ...state, doublesStreak: newStreak, dice: action.dice };
      const newPos = advancePosition(player.position, total);
      const moveResult = movePlayer(s, player.id, newPos, true);
      s = moveResult.state;
      events.push(...moveResult.events);

      const tileResult = resolveTile(s, player.id, total);
      s = tileResult.state;
      events.push(...tileResult.events);

      return { state: s, events };
    }

    // ── Buy ─────────────────────────────────────────────────────────────────
    case 'buy': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'rolled');
      if (state.pendingBuy === null) throw new GameRuleError('No property pending', 'NO_PENDING_BUY');

      const tilePos = state.pendingBuy;
      const tile = tileAt(state, tilePos) as Tile & { price: number };
      if (!tile.price) throw new GameRuleError('Tile has no price', 'NO_PRICE');

      const player = currentPlayer(state);
      if (player.cash < tile.price) throw new GameRuleError('Not enough cash', 'INSUFFICIENT_FUNDS');

      const events: GameEvent[] = [{ type: 'bought', playerId: action.playerId, tilePosition: tilePos, price: tile.price }];

      let s = payPlayer(state, action.playerId, null, tile.price);
      s = updatePlayer(s, action.playerId, {
        properties: [...player.properties, tilePos],
      });
      s = {
        ...s,
        ownership: { ...s.ownership, [tilePos]: action.playerId },
        turnPhase: 'post_action',
        pendingBuy: null,
      };

      return { state: s, events };
    }

    // ── Decline → Auction ────────────────────────────────────────────────────
    case 'decline': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'rolled');
      if (state.pendingBuy === null) throw new GameRuleError('No property pending', 'NO_PENDING_BUY');

      const tilePos = state.pendingBuy;
      const participants = state.players.filter((p) => !p.bankrupt).map((p) => p.id);
      const events: GameEvent[] = [{ type: 'auction_started', tilePosition: tilePos, startedByPlayerId: action.playerId }];

      const s: GameState = {
        ...state,
        turnPhase: 'auction',
        pendingBuy: null,
        auction: {
          tilePosition: tilePos,
          currentBid: 0,
          currentBidderId: null,
          participantIds: participants,
          passedIds: [],
          startedByPlayerId: action.playerId,
        },
      };
      return { state: s, events };
    }

    // ── Bid ──────────────────────────────────────────────────────────────────
    case 'bid': {
      assertPhase(state, 'auction');
      if (!state.auction) throw new GameRuleError('No auction in progress', 'NO_AUCTION');

      const { auction } = state;
      if (!auction.participantIds.includes(action.playerId)) {
        throw new GameRuleError('Not an auction participant', 'NOT_PARTICIPANT');
      }

      const newBid = auction.currentBid + action.increment;
      const player = state.players.find((p) => p.id === action.playerId)!;
      if (player.cash < newBid) throw new GameRuleError('Not enough cash to bid', 'INSUFFICIENT_FUNDS');

      const events: GameEvent[] = [{ type: 'auction_bid', playerId: action.playerId, amount: newBid }];
      const s: GameState = {
        ...state,
        auction: { ...auction, currentBid: newBid, currentBidderId: action.playerId },
      };
      return { state: s, events };
    }

    // ── Pass auction ─────────────────────────────────────────────────────────
    case 'pass_auction': {
      assertPhase(state, 'auction');
      if (!state.auction) throw new GameRuleError('No auction in progress', 'NO_AUCTION');

      const { auction } = state;
      if (!auction.participantIds.includes(action.playerId)) {
        throw new GameRuleError('Not an auction participant', 'NOT_PARTICIPANT');
      }

      const remaining = auction.participantIds.filter((id) => id !== action.playerId);
      const passed = [...auction.passedIds, action.playerId];
      const events: GameEvent[] = [];

      if (remaining.length === 0 || (remaining.length === 1 && auction.currentBidderId && remaining[0] === auction.currentBidderId && remaining.length === 1)) {
        // Auction over — resolve winner
        return resolveAuction({ ...state, auction: { ...auction, participantIds: remaining, passedIds: passed } }, events);
      }

      // Only one bidder left — they win
      if (remaining.length === 1 && auction.currentBid > 0) {
        return resolveAuction({ ...state, auction: { ...auction, participantIds: remaining, passedIds: passed } }, events);
      }

      // All remaining passed with no bids
      if (remaining.length === 0) {
        return resolveAuction({ ...state, auction: { ...auction, participantIds: remaining, passedIds: passed } }, events);
      }

      const s: GameState = {
        ...state,
        auction: { ...auction, participantIds: remaining, passedIds: passed },
      };
      return { state: s, events };
    }

    // ── End turn ─────────────────────────────────────────────────────────────
    case 'end_turn': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      const wasDoubles = state.doublesStreak > 0;
      const cp = currentPlayer(state);
      const inJail = cp.jail.inJail;

      // If doubles and not in jail, current player gets another turn
      if (wasDoubles && !inJail) {
        const s: GameState = {
          ...state,
          turnPhase: 'pre_roll',
          dice: null,
        };
        return { state: s, events: [] };
      }

      const nextIdx = nextSolventPlayer(state);
      const s: GameState = {
        ...state,
        currentPlayerIndex: nextIdx,
        turnPhase: 'pre_roll',
        dice: null,
        doublesStreak: 0,
      };
      return { state: s, events: [] };
    }

    // ── Mortgage ─────────────────────────────────────────────────────────────
    case 'mortgage': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      if (!canMortgage(state, action.playerId, action.tilePosition)) {
        throw new GameRuleError('Cannot mortgage this property', 'CANT_MORTGAGE');
      }

      const tile = tileAt(state, action.tilePosition) as Tile & { price: number };
      const mv = mortgageValue(tile.price);
      const events: GameEvent[] = [{ type: 'mortgaged', playerId: action.playerId, tilePosition: action.tilePosition, received: mv }];

      let s = payPlayer(state, 'bank', action.playerId, mv);
      s = { ...s, mortgaged: { ...s.mortgaged, [action.tilePosition]: true } };
      return { state: s, events };
    }

    // ── Unmortgage ───────────────────────────────────────────────────────────
    case 'unmortgage': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      if (!canUnmortgage(state, action.playerId, action.tilePosition)) {
        throw new GameRuleError('Cannot unmortgage this property', 'CANT_UNMORTGAGE');
      }

      const tile = tileAt(state, action.tilePosition) as Tile & { price: number };
      const cost = unmortgageCost(mortgageValue(tile.price));
      const events: GameEvent[] = [{ type: 'unmortgaged', playerId: action.playerId, tilePosition: action.tilePosition, paid: cost }];

      let s = payPlayer(state, action.playerId, null, cost);
      s = { ...s, mortgaged: { ...s.mortgaged, [action.tilePosition]: false } };
      return { state: s, events };
    }

    // ── Build ────────────────────────────────────────────────────────────────
    case 'build': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      if (!canBuild(state, action.playerId, action.tilePosition)) {
        throw new GameRuleError('Cannot build here', 'CANT_BUILD');
      }

      const tile = tileAt(state, action.tilePosition) as Tile & { buildCost: number };
      const player = currentPlayer(state);
      if (player.cash < tile.buildCost) throw new GameRuleError('Not enough cash to build', 'INSUFFICIENT_FUNDS');

      const newBuildings = (state.buildings[action.tilePosition] ?? 0) + 1;
      const events: GameEvent[] = [{ type: 'built', playerId: action.playerId, tilePosition: action.tilePosition, buildings: newBuildings }];

      let s = payPlayer(state, action.playerId, null, tile.buildCost);
      s = { ...s, buildings: { ...s.buildings, [action.tilePosition]: newBuildings } };
      return { state: s, events };
    }

    // ── Sell building ────────────────────────────────────────────────────────
    case 'sell_building': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      if (!canSellBuilding(state, action.playerId, action.tilePosition)) {
        throw new GameRuleError('Cannot sell building here', 'CANT_SELL_BUILDING');
      }

      const tile = tileAt(state, action.tilePosition) as Tile & { buildCost: number };
      const refund = Math.floor(tile.buildCost / 2);
      const newBuildings = (state.buildings[action.tilePosition] ?? 0) - 1;
      const events: GameEvent[] = [{ type: 'sold_building', playerId: action.playerId, tilePosition: action.tilePosition, buildings: newBuildings }];

      let s = payPlayer(state, 'bank', action.playerId, refund);
      s = { ...s, buildings: { ...s.buildings, [action.tilePosition]: newBuildings } };
      return { state: s, events };
    }

    // ── Trade create ─────────────────────────────────────────────────────────
    case 'trade_create': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'post_action');

      const tradeId = generateTradeId();
      const trade = {
        id: tradeId,
        fromId: action.playerId,
        toId: action.toId,
        offer: action.offer,
        demand: action.demand,
        status: 'pending' as const,
      };
      const events: GameEvent[] = [{ type: 'trade_proposed', fromId: action.playerId, toId: action.toId, tradeId }];
      const s: GameState = { ...state, trades: [...state.trades, trade], turnPhase: 'trade' };
      return { state: s, events };
    }

    // ── Trade respond ────────────────────────────────────────────────────────
    case 'trade_respond': {
      const trade = state.trades.find((t) => t.id === action.tradeId);
      if (!trade) throw new GameRuleError('Trade not found', 'TRADE_NOT_FOUND');
      if (trade.toId !== action.playerId) throw new GameRuleError('Not your trade', 'NOT_YOUR_TRADE');
      if (trade.status !== 'pending') throw new GameRuleError('Trade already resolved', 'TRADE_RESOLVED');

      if (action.action === 'reject') {
        const events: GameEvent[] = [{ type: 'trade_rejected', tradeId: action.tradeId }];
        const s: GameState = {
          ...state,
          trades: state.trades.map((t) => t.id === action.tradeId ? { ...t, status: 'rejected' } : t),
          turnPhase: 'post_action',
        };
        return { state: s, events };
      }

      // Accept — execute the trade
      const events: GameEvent[] = [{ type: 'trade_accepted', tradeId: action.tradeId }];
      let s: GameState = state;

      // Cash
      if (trade.offer.cash > 0) s = payPlayer(s, trade.fromId, trade.toId, trade.offer.cash);
      if (trade.demand.cash > 0) s = payPlayer(s, trade.toId, trade.fromId, trade.demand.cash);

      // Properties offered (from → to)
      if (trade.offer.properties.length > 0) {
        const from = s.players.find((p) => p.id === trade.fromId)!;
        const to = s.players.find((p) => p.id === trade.toId)!;
        const newOwnership = { ...s.ownership };
        for (const pos of trade.offer.properties) {
          newOwnership[pos] = trade.toId;
        }
        s = updatePlayer(s, trade.fromId, {
          properties: from.properties.filter((p) => !trade.offer.properties.includes(p)),
        });
        s = updatePlayer(s, trade.toId, {
          properties: [...to.properties, ...trade.offer.properties],
        });
        s = { ...s, ownership: newOwnership };
      }

      // Properties demanded (to → from)
      if (trade.demand.properties.length > 0) {
        const from = s.players.find((p) => p.id === trade.fromId)!;
        const to = s.players.find((p) => p.id === trade.toId)!;
        const newOwnership = { ...s.ownership };
        for (const pos of trade.demand.properties) {
          newOwnership[pos] = trade.fromId;
        }
        s = updatePlayer(s, trade.toId, {
          properties: to.properties.filter((p) => !trade.demand.properties.includes(p)),
        });
        s = updatePlayer(s, trade.fromId, {
          properties: [...from.properties, ...trade.demand.properties],
        });
        s = { ...s, ownership: newOwnership };
      }

      // Jail cards
      if (trade.offer.jailCards > 0) {
        const from = s.players.find((p) => p.id === trade.fromId)!;
        const to = s.players.find((p) => p.id === trade.toId)!;
        s = updatePlayer(s, trade.fromId, { jail: { ...from.jail, getOutCards: from.jail.getOutCards - trade.offer.jailCards } });
        s = updatePlayer(s, trade.toId, { jail: { ...to.jail, getOutCards: to.jail.getOutCards + trade.offer.jailCards } });
      }
      if (trade.demand.jailCards > 0) {
        const from = s.players.find((p) => p.id === trade.fromId)!;
        const to = s.players.find((p) => p.id === trade.toId)!;
        s = updatePlayer(s, trade.toId, { jail: { ...to.jail, getOutCards: to.jail.getOutCards - trade.demand.jailCards } });
        s = updatePlayer(s, trade.fromId, { jail: { ...from.jail, getOutCards: from.jail.getOutCards + trade.demand.jailCards } });
      }

      s = {
        ...s,
        trades: s.trades.map((t) => t.id === action.tradeId ? { ...t, status: 'accepted' } : t),
        turnPhase: 'post_action',
      };
      return { state: s, events };
    }

    // ── Pay jail fine ────────────────────────────────────────────────────────
    case 'pay_jail_fine': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'pre_roll');
      const player = currentPlayer(state);
      if (!player.jail.inJail) throw new GameRuleError('Not in jail', 'NOT_IN_JAIL');

      const fine = state.settings.jailFine;
      if (player.cash < fine) throw new GameRuleError('Not enough cash', 'INSUFFICIENT_FUNDS');

      const events: GameEvent[] = [{ type: 'released_from_prison', playerId: player.id, reason: 'fine' }];
      let s = payPlayer(state, player.id, null, fine);
      s = updatePlayer(s, player.id, { jail: { inJail: false, turnsServed: 0, getOutCards: player.jail.getOutCards } });
      return { state: s, events };
    }

    // ── Use jail card ────────────────────────────────────────────────────────
    case 'use_jail_card': {
      assertCurrentPlayer(state, action.playerId);
      assertPhase(state, 'pre_roll');
      const player = currentPlayer(state);
      if (!player.jail.inJail) throw new GameRuleError('Not in jail', 'NOT_IN_JAIL');
      if (player.jail.getOutCards <= 0) throw new GameRuleError('No jail cards', 'NO_JAIL_CARDS');

      const events: GameEvent[] = [{ type: 'released_from_prison', playerId: player.id, reason: 'card' }];
      let s = updatePlayer(state, player.id, {
        jail: { inJail: false, turnsServed: 0, getOutCards: player.jail.getOutCards - 1 },
      });
      return { state: s, events };
    }

    // ── Declare bankrupt ─────────────────────────────────────────────────────
    case 'declare_bankrupt': {
      assertCurrentPlayer(state, action.playerId);
      const player = currentPlayer(state);

      // Find who they owe (the player who triggered the bankruptcy, if any)
      // For simplicity: the player they most recently paid rent to, or null (bank)
      // The server should pass the creditor context; here we default to bank
      const creditorId: string | null = null;

      const events: GameEvent[] = [{ type: 'bankrupt', playerId: player.id, creditorId }];
      let s = transferBankrupt(state, player, creditorId);

      const gameOver = checkGameOver(s);
      s = gameOver.state;
      events.push(...gameOver.events);

      if (s.status !== 'finished') {
        const nextIdx = nextSolventPlayer(s);
        s = { ...s, currentPlayerIndex: nextIdx, turnPhase: 'pre_roll', dice: null, doublesStreak: 0 };
      }

      return { state: s, events };
    }

    default:
      throw new GameRuleError(`Unknown action type`, 'UNKNOWN_ACTION');
  }
}

// ─── Auction resolution helper ────────────────────────────────────────────────

function resolveAuction(state: GameState, events: GameEvent[]): ReduceResult {
  const { auction } = state;
  if (!auction) return { state, events };

  const winnerId = auction.currentBidderId;

  if (!winnerId || auction.currentBid === 0) {
    // No winner — property stays unowned
    events.push({ type: 'auction_no_winner', tilePosition: auction.tilePosition });
    const s: GameState = { ...state, auction: null, turnPhase: 'post_action' };
    return { state: s, events };
  }

  // Winner pays and receives property
  const winner = state.players.find((p) => p.id === winnerId)!;
  events.push({ type: 'auction_won', playerId: winnerId, tilePosition: auction.tilePosition, amount: auction.currentBid });

  let s = payPlayer(state, winnerId, null, auction.currentBid);
  s = updatePlayer(s, winnerId, {
    properties: [...winner.properties, auction.tilePosition],
  });
  s = {
    ...s,
    ownership: { ...s.ownership, [auction.tilePosition]: winnerId },
    auction: null,
    turnPhase: 'post_action',
  };
  return { state: s, events };
}
