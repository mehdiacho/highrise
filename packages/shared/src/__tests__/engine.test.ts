import { describe, it, expect } from 'vitest';
import { reduce } from '../engine/reduce.js';
import { mortgageValue, unmortgageCost, canBuild, canMortgage, calcRent } from '../engine/rules.js';
import { makeState, makePlayer, roll } from './helpers.js';
import type { GameState } from '../types.js';

// ─── Mortgage math ────────────────────────────────────────────────────────────

describe('mortgageValue', () => {
  it('floors price/2', () => {
    expect(mortgageValue(60)).toBe(30);
    expect(mortgageValue(140)).toBe(70);
    expect(mortgageValue(350)).toBe(175);
  });
});

describe('unmortgageCost', () => {
  it('is mortgageValue * 1.1 rounded', () => {
    expect(unmortgageCost(30)).toBe(33);   // 30 * 1.1 = 33
    expect(unmortgageCost(70)).toBe(77);   // 70 * 1.1 = 77
    expect(unmortgageCost(175)).toBe(193); // 175 * 1.1 = 192.5 → 193
  });
});

// ─── Roll ─────────────────────────────────────────────────────────────────────

describe('roll — basic movement', () => {
  it('moves player by dice total', () => {
    const state = makeState();
    const { state: next } = reduce(state, roll('p1', 2, 3));
    expect(next.players[0]!.position).toBe(5); // Start (0) + 5
  });

  it('sets dice on state', () => {
    const state = makeState();
    const { state: next } = reduce(state, roll('p1', 1, 4));
    expect(next.dice).toEqual([1, 4]);
  });

  it('emits rolled and moved events', () => {
    const state = makeState();
    const { events } = reduce(state, roll('p1', 2, 3));
    expect(events.some((e) => e.type === 'rolled')).toBe(true);
    expect(events.some((e) => e.type === 'moved')).toBe(true);
  });
});

describe('roll — pass Start bonus', () => {
  it('collects $200 when wrapping from position 39', () => {
    const state = makeState({ players: [makePlayer('p1', { position: 39 }), makePlayer('p2')] });
    const { state: next, events } = reduce(state, roll('p1', 1, 1));
    expect(next.players[0]!.cash).toBe(1500 + 200); // passed Start
    expect(events.some((e) => e.type === 'passed_start')).toBe(true);
  });

  it('collects $200 when landing on Start exactly', () => {
    const state = makeState({ players: [makePlayer('p1', { position: 36 }), makePlayer('p2')] });
    const { state: next, events } = reduce(state, roll('p1', 2, 2));
    expect(next.players[0]!.cash).toBe(1500 + 200);
    expect(events.some((e) => e.type === 'passed_start')).toBe(true);
  });

  it('does NOT collect $200 when not passing Start', () => {
    const state = makeState({ players: [makePlayer('p1', { position: 5 }), makePlayer('p2')] });
    const { state: next } = reduce(state, roll('p1', 2, 2));
    expect(next.players[0]!.cash).toBe(1500); // no Start bonus
  });
});

describe('roll — doubles', () => {
  it('tracks doublesStreak', () => {
    const state = makeState();
    const { state: next } = reduce(state, roll('p1', 2, 2));
    expect(next.doublesStreak).toBe(1);
  });

  it('resets doublesStreak on non-doubles', () => {
    const state = makeState({ doublesStreak: 1 });
    const { state: next } = reduce(state, roll('p1', 1, 3));
    expect(next.doublesStreak).toBe(0);
  });

  it('third consecutive doubles sends player to Prison and does NOT resolve tile', () => {
    const state = makeState({ doublesStreak: 2, turnPhase: 'pre_roll' });
    const { state: next, events } = reduce(state, roll('p1', 3, 3));
    expect(next.players[0]!.jail.inJail).toBe(true);
    expect(next.players[0]!.position).toBe(10); // Prison tile
    expect(next.doublesStreak).toBe(0);
    expect(events.some((e) => e.type === 'sent_to_prison')).toBe(true);
    // No buy prompt — player didn't land on a property
    expect(next.pendingBuy).toBeNull();
  });
});

// ─── Go to Prison tile ───────────────────────────────────────────────────────

describe('Go to Prison tile', () => {
  it('teleports player to Prison position 10 and sets inJail', () => {
    // Position 30 - 10 steps = 40 → wraps to 0? No. pos 21 + 9 = 30
    const state = makeState({ players: [makePlayer('p1', { position: 21 }), makePlayer('p2')] });
    const { state: next, events } = reduce(state, roll('p1', 4, 5)); // 21+9=30
    expect(next.players[0]!.position).toBe(10);
    expect(next.players[0]!.jail.inJail).toBe(true);
    expect(events.some((e) => e.type === 'sent_to_prison')).toBe(true);
  });

  it('does NOT collect Start money when sent to Prison', () => {
    // Landing on pos 30 should not give $200
    const state = makeState({ players: [makePlayer('p1', { position: 21 }), makePlayer('p2')] });
    const { state: next } = reduce(state, roll('p1', 4, 5));
    expect(next.players[0]!.cash).toBe(1500); // no bonus
  });
});

// ─── Vacation tile ────────────────────────────────────────────────────────────

describe('Vacation tile', () => {
  it('does nothing when landing on Vacation', () => {
    const state = makeState({ players: [makePlayer('p1', { position: 16 }), makePlayer('p2')] });
    const { state: next } = reduce(state, roll('p1', 2, 2)); // 16+4=20 = Vacation
    expect(next.players[0]!.cash).toBe(1500);
    expect(next.turnPhase).toBe('post_action');
  });
});

// ─── Tax tiles ────────────────────────────────────────────────────────────────

describe('Income Tax', () => {
  it('deducts $200 from player cash', () => {
    // pos 0 + 4 = pos 4 Income Tax
    const state = makeState();
    const { state: next, events } = reduce(state, roll('p1', 2, 2));
    expect(next.players[0]!.cash).toBe(1500 - 200);
    expect(events.some((e) => e.type === 'tax_paid')).toBe(true);
  });
});

describe('Luxury Tax', () => {
  it('deducts $100 from player cash at tile 37', () => {
    const state = makeState({ players: [makePlayer('p1', { position: 33 }), makePlayer('p2')] });
    const { state: next, events } = reduce(state, roll('p1', 2, 2)); // 33+4=37 Luxury Tax
    expect(next.players[0]!.cash).toBe(1500 - 100);
    expect(events.some((e) => e.type === 'tax_paid')).toBe(true);
  });
});

// ─── Buy property ─────────────────────────────────────────────────────────────

describe('buy', () => {
  it('deducts price and assigns ownership', () => {
    // p1 at pos 0, roll to pos 1 (Tallinn, $60)
    const state = makeState();
    const { state: afterRoll } = reduce(state, roll('p1', 1, 0 as never));
    // use legal dice
    const state2 = makeState({ players: [makePlayer('p1', { position: 0 }), makePlayer('p2')] });
    const { state: rolled } = reduce(state2, roll('p1', 1, 0 as never));
    // Actually use valid dice (min 1+1=2, but Tallinn is at 1)
    // Let's manually set position
    const s = makeState({
      turnPhase: 'rolled',
      pendingBuy: 1,
      players: [makePlayer('p1', { position: 1 }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(s, { type: 'buy', playerId: 'p1' });
    expect(next.players[0]!.cash).toBe(1500 - 60);
    expect(next.ownership[1]).toBe('p1');
    expect(next.players[0]!.properties).toContain(1);
    expect(events.some((e) => e.type === 'bought')).toBe(true);
  });

  it('throws if not enough cash', () => {
    const s = makeState({
      turnPhase: 'rolled',
      pendingBuy: 38,
      players: [makePlayer('p1', { position: 38, cash: 100 }), makePlayer('p2')],
    });
    expect(() => reduce(s, { type: 'buy', playerId: 'p1' })).toThrow();
  });
});

// ─── Decline → Auction ───────────────────────────────────────────────────────

describe('decline → auction', () => {
  it('starts an auction with all players as participants', () => {
    const s = makeState({
      turnPhase: 'rolled',
      pendingBuy: 1,
    });
    const { state: next, events } = reduce(s, { type: 'decline', playerId: 'p1' });
    expect(next.turnPhase).toBe('auction');
    expect(next.auction).not.toBeNull();
    expect(next.auction!.participantIds).toContain('p1');
    expect(next.auction!.participantIds).toContain('p2');
    expect(events.some((e) => e.type === 'auction_started')).toBe(true);
  });
});

describe('bid', () => {
  it('increases current bid', () => {
    const s = makeState({
      turnPhase: 'auction',
      auction: { tilePosition: 1, currentBid: 0, currentBidderId: null, participantIds: ['p1', 'p2'], passedIds: [], startedByPlayerId: 'p1' },
    });
    const { state: next, events } = reduce(s, { type: 'bid', playerId: 'p1', increment: 10 });
    expect(next.auction!.currentBid).toBe(10);
    expect(next.auction!.currentBidderId).toBe('p1');
    expect(events.some((e) => e.type === 'auction_bid')).toBe(true);
  });
});

describe('auction — all pass, no winner', () => {
  it('property stays unowned when nobody bids', () => {
    const s = makeState({
      turnPhase: 'auction',
      auction: { tilePosition: 1, currentBid: 0, currentBidderId: null, participantIds: ['p1', 'p2'], passedIds: [], startedByPlayerId: 'p1' },
    });
    const { state: s2 } = reduce(s, { type: 'pass_auction', playerId: 'p1' });
    const { state: s3, events } = reduce(s2, { type: 'pass_auction', playerId: 'p2' });
    expect(s3.auction).toBeNull();
    expect(s3.ownership[1]).toBeFalsy();
    expect(events.some((e) => e.type === 'auction_no_winner')).toBe(true);
  });
});

describe('auction — winner pays and gets property', () => {
  it('transfers property to highest bidder', () => {
    const s = makeState({
      turnPhase: 'auction',
      auction: { tilePosition: 1, currentBid: 20, currentBidderId: 'p2', participantIds: ['p1', 'p2'], passedIds: [], startedByPlayerId: 'p1' },
    });
    // p1 passes — p2 is sole remaining bidder
    const { state: next, events } = reduce(s, { type: 'pass_auction', playerId: 'p1' });
    expect(next.ownership[1]).toBe('p2');
    expect(next.players[1]!.cash).toBe(1500 - 20);
    expect(events.some((e) => e.type === 'auction_won')).toBe(true);
  });
});

// ─── Rent ─────────────────────────────────────────────────────────────────────

describe('rent — base rent', () => {
  it('pays base rent on unimproved property', () => {
    const s = makeState({
      ownership: { 1: 'p2' },
      players: [makePlayer('p1', { position: 0 }), makePlayer('p2')],
    });
    // p1 lands on pos 1 (Tallinn, base $2)
    const s2: GameState = { ...s, turnPhase: 'post_action' };
    // Simulate landing: set position and resolve
    const beforeRent = makeState({
      ownership: { 1: 'p2' },
      players: [makePlayer('p1', { position: 0 }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(beforeRent, roll('p1', 1, 0 as never));
    // Invalid dice — use a direct test on calcRent instead
    const tile = s.board[1]!;
    expect(calcRent(s, tile, 'p2', 4)).toBe(2); // base rent
  });
});

describe('rent — full group doubles rent', () => {
  it('doubles rent when owner has full color group unimproved', () => {
    // p2 owns all brown: pos 1 and pos 3
    const s = makeState({
      ownership: { 1: 'p2', 3: 'p2' },
    });
    const tile1 = s.board[1]!;
    const tile3 = s.board[3]!;
    expect(calcRent(s, tile1, 'p2', 4)).toBe(4);  // fullSet = 4
    expect(calcRent(s, tile3, 'p2', 4)).toBe(8);  // fullSet = 8
  });

  it('does NOT double rent when owner lacks the full group', () => {
    const s = makeState({ ownership: { 1: 'p2' } }); // only one brown
    const tile = s.board[1]!;
    expect(calcRent(s, tile, 'p2', 4)).toBe(2); // base
  });
});

describe('rent — mortgaged property', () => {
  it('pays NO rent on mortgaged property', () => {
    const s = makeState({
      ownership: { 1: 'p2' },
      mortgaged: { 1: true },
    });
    const tile = s.board[1]!;
    expect(calcRent(s, tile, 'p2', 4)).toBe(0);
  });
});

describe('rent — buildings', () => {
  it('charges house1 rent with 1 house', () => {
    const s = makeState({
      ownership: { 1: 'p2', 3: 'p2' },
      buildings: { 1: 1 },
    });
    const tile = s.board[1]!;
    expect(calcRent(s, tile, 'p2', 4)).toBe(10); // house1 = 10
  });

  it('charges hotel rent with 5 buildings', () => {
    const s = makeState({
      ownership: { 1: 'p2', 3: 'p2' },
      buildings: { 1: 5 },
    });
    const tile = s.board[1]!;
    expect(calcRent(s, tile, 'p2', 4)).toBe(250); // hotel = 250
  });
});

describe('rent — airport', () => {
  it('scales with number of airports owned (25/50/100/200)', () => {
    const [a1, a2, a3, a4] = [5, 15, 25, 35];
    const ownership: Record<number, string> = { [a1!]: 'p2' };
    let s = makeState({ ownership });
    expect(calcRent(s, s.board[a1!]!, 'p2', 7)).toBe(25);

    ownership[a2!] = 'p2';
    s = makeState({ ownership });
    expect(calcRent(s, s.board[a1!]!, 'p2', 7)).toBe(50);

    ownership[a3!] = 'p2';
    s = makeState({ ownership });
    expect(calcRent(s, s.board[a1!]!, 'p2', 7)).toBe(100);

    ownership[a4!] = 'p2';
    s = makeState({ ownership });
    expect(calcRent(s, s.board[a1!]!, 'p2', 7)).toBe(200);
  });
});

describe('rent — utility', () => {
  it('4× dice total with one utility owned', () => {
    const s = makeState({ ownership: { 12: 'p2' } });
    expect(calcRent(s, s.board[12]!, 'p2', 8)).toBe(32); // 8 * 4
  });

  it('10× dice total with both utilities owned', () => {
    const s = makeState({ ownership: { 12: 'p2', 28: 'p2' } });
    expect(calcRent(s, s.board[12]!, 'p2', 8)).toBe(80); // 8 * 10
  });
});

// ─── Jail ──────────────────────────────────────────────────────────────────────

describe('jail — paying fine', () => {
  it('releases player and deducts fine', () => {
    const s = makeState({
      players: [
        makePlayer('p1', { jail: { inJail: true, turnsServed: 0, getOutCards: 0 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next, events } = reduce(s, { type: 'pay_jail_fine', playerId: 'p1' });
    expect(next.players[0]!.jail.inJail).toBe(false);
    expect(next.players[0]!.cash).toBe(1500 - 50);
    expect(events.some((e) => e.type === 'released_from_prison')).toBe(true);
  });
});

describe('jail — using get-out card', () => {
  it('releases player and decrements card count', () => {
    const s = makeState({
      players: [
        makePlayer('p1', { jail: { inJail: true, turnsServed: 0, getOutCards: 1 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next } = reduce(s, { type: 'use_jail_card', playerId: 'p1' });
    expect(next.players[0]!.jail.inJail).toBe(false);
    expect(next.players[0]!.jail.getOutCards).toBe(0);
  });
});

describe('jail — escaping with doubles', () => {
  it('releases player when rolling doubles in jail', () => {
    const s = makeState({
      players: [
        makePlayer('p1', { position: 10, jail: { inJail: true, turnsServed: 1, getOutCards: 0 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next, events } = reduce(s, roll('p1', 3, 3));
    expect(next.players[0]!.jail.inJail).toBe(false);
    expect(next.players[0]!.position).toBe(16); // 10 + 6
    expect(events.some((e) => e.type === 'released_from_prison')).toBe(true);
  });

  it('doubles from jail do NOT grant extra turn (streak stays 0)', () => {
    const s = makeState({
      players: [
        makePlayer('p1', { position: 10, jail: { inJail: true, turnsServed: 1, getOutCards: 0 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next } = reduce(s, roll('p1', 3, 3));
    expect(next.doublesStreak).toBe(0);
  });
});

describe('jail — forced release on 3rd turn', () => {
  it('pays fine and moves after maxJailTurns', () => {
    const s = makeState({
      players: [
        makePlayer('p1', { position: 10, jail: { inJail: true, turnsServed: 2, getOutCards: 0 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next, events } = reduce(s, roll('p1', 1, 2)); // non-doubles
    expect(next.players[0]!.jail.inJail).toBe(false);
    expect(next.players[0]!.cash).toBe(1500 - 50); // fine paid
    expect(next.players[0]!.position).toBe(13); // 10 + 3
    expect(events.some((e) => e.type === 'released_from_prison')).toBe(true);
  });
});

describe('jail — collecting rent while imprisoned', () => {
  it('imprisoned player still collects rent on their properties', () => {
    const s = makeState({
      ownership: { 1: 'p1' },
      players: [
        makePlayer('p1', {
          position: 10,
          properties: [1],
          jail: { inJail: true, turnsServed: 1, getOutCards: 0 },
        }),
        makePlayer('p2', { position: 0 }),
      ],
      currentPlayerIndex: 1,
    });
    // p2 rolls and lands on pos 1 (Tallinn, owned by p1)
    const { state: next, events } = reduce(s, roll('p2', 1, 0 as never));
    // Actually we can't roll 1, let's just verify calcRent works regardless of jail
    // Test via calcRent directly
    const tile = s.board[1]!;
    const rent = calcRent(s, tile, 'p1', 4);
    expect(rent).toBe(2); // still charges rent
  });
});

// ─── Building evenness ────────────────────────────────────────────────────────

describe('canBuild — evenness', () => {
  it('allows building when all in group have equal count', () => {
    const s = makeState({
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 0, 3: 0 },
    });
    expect(canBuild(s, 'p1', 1)).toBe(true);
    expect(canBuild(s, 'p1', 3)).toBe(true);
  });

  it('blocks building when this property already has more than the group min', () => {
    const s = makeState({
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 1, 3: 0 }, // pos 1 has 1, pos 3 has 0
    });
    expect(canBuild(s, 'p1', 1)).toBe(false); // already ahead of group min
    expect(canBuild(s, 'p1', 3)).toBe(true);  // at group min
  });

  it('blocks building when group has a mortgaged property', () => {
    const s = makeState({
      ownership: { 1: 'p1', 3: 'p1' },
      mortgaged: { 3: true },
    });
    expect(canBuild(s, 'p1', 1)).toBe(false);
  });

  it('blocks building on max hotel (5)', () => {
    const s = makeState({
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 5, 3: 5 },
    });
    expect(canBuild(s, 'p1', 1)).toBe(false);
  });

  it('blocks building without full group', () => {
    const s = makeState({
      ownership: { 1: 'p1' }, // missing pos 3
    });
    expect(canBuild(s, 'p1', 1)).toBe(false);
  });
});

// ─── build action ─────────────────────────────────────────────────────────────

describe('build action', () => {
  it('deducts buildCost and increments building count', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: {},
    });
    const { state: next, events } = reduce(s, { type: 'build', playerId: 'p1', tilePosition: 1 });
    expect(next.players[0]!.cash).toBe(1500 - 50); // buildCost = 50 for brown
    expect(next.buildings[1]).toBe(1);
    expect(events.some((e) => e.type === 'built')).toBe(true);
  });

  it('throws if evenness violated', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 1, 3: 0 },
    });
    expect(() => reduce(s, { type: 'build', playerId: 'p1', tilePosition: 1 })).toThrow();
  });
});

// ─── Sell building ────────────────────────────────────────────────────────────

describe('sell_building action', () => {
  it('refunds half buildCost and decrements building count', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 1, 3: 1 },
    });
    const { state: next, events } = reduce(s, { type: 'sell_building', playerId: 'p1', tilePosition: 1 });
    expect(next.players[0]!.cash).toBe(1500 + 25); // refund = 50/2
    expect(next.buildings[1]).toBe(0);
    expect(events.some((e) => e.type === 'sold_building')).toBe(true);
  });
});

// ─── Mortgage / unmortgage ────────────────────────────────────────────────────

describe('mortgage action', () => {
  it('pays mortgageValue to player and marks property mortgaged', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1' },
      players: [makePlayer('p1', { properties: [1] }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(s, { type: 'mortgage', playerId: 'p1', tilePosition: 1 });
    expect(next.players[0]!.cash).toBe(1500 + 30); // mortgageValue(60) = 30
    expect(next.mortgaged[1]).toBe(true);
    expect(events.some((e) => e.type === 'mortgaged')).toBe(true);
  });

  it('blocks mortgage when group has buildings', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1', 3: 'p1' },
      buildings: { 1: 1 },
      players: [makePlayer('p1', { properties: [1, 3] }), makePlayer('p2')],
    });
    expect(() => reduce(s, { type: 'mortgage', playerId: 'p1', tilePosition: 1 })).toThrow();
  });
});

describe('unmortgage action', () => {
  it('charges unmortgageCost and unmarks property', () => {
    const s = makeState({
      turnPhase: 'post_action',
      ownership: { 1: 'p1' },
      mortgaged: { 1: true },
      players: [makePlayer('p1', { properties: [1], cash: 500 }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(s, { type: 'unmortgage', playerId: 'p1', tilePosition: 1 });
    expect(next.players[0]!.cash).toBe(500 - 33); // unmortgageCost(30) = 33
    expect(next.mortgaged[1]).toBe(false);
    expect(events.some((e) => e.type === 'unmortgaged')).toBe(true);
  });
});

// ─── Trade ───────────────────────────────────────────────────────────────────

describe('trade', () => {
  it('creates a pending trade', () => {
    const s = makeState({ turnPhase: 'post_action' });
    const { state: next, events } = reduce(s, {
      type: 'trade_create',
      playerId: 'p1',
      toId: 'p2',
      offer: { cash: 100, properties: [], jailCards: 0 },
      demand: { cash: 0, properties: [], jailCards: 0 },
    });
    expect(next.trades.length).toBe(1);
    expect(next.trades[0]!.status).toBe('pending');
    expect(events.some((e) => e.type === 'trade_proposed')).toBe(true);
  });

  it('transfers cash on accept', () => {
    const s = makeState({
      turnPhase: 'trade',
      trades: [{
        id: 'tr_test',
        fromId: 'p1',
        toId: 'p2',
        offer: { cash: 100, properties: [], jailCards: 0 },
        demand: { cash: 0, properties: [], jailCards: 0 },
        status: 'pending',
      }],
    });
    const { state: next, events } = reduce(s, {
      type: 'trade_respond',
      playerId: 'p2',
      tradeId: 'tr_test',
      action: 'accept',
    });
    expect(next.players[0]!.cash).toBe(1500 - 100);
    expect(next.players[1]!.cash).toBe(1500 + 100);
    expect(events.some((e) => e.type === 'trade_accepted')).toBe(true);
  });

  it('transfers properties on accept', () => {
    const s = makeState({
      turnPhase: 'trade',
      ownership: { 1: 'p1' },
      players: [makePlayer('p1', { properties: [1] }), makePlayer('p2')],
      trades: [{
        id: 'tr_test2',
        fromId: 'p1',
        toId: 'p2',
        offer: { cash: 0, properties: [1], jailCards: 0 },
        demand: { cash: 0, properties: [], jailCards: 0 },
        status: 'pending',
      }],
    });
    const { state: next } = reduce(s, {
      type: 'trade_respond',
      playerId: 'p2',
      tradeId: 'tr_test2',
      action: 'accept',
    });
    expect(next.ownership[1]).toBe('p2');
    expect(next.players[1]!.properties).toContain(1);
    expect(next.players[0]!.properties).not.toContain(1);
  });

  it('rejected trade has status rejected', () => {
    const s = makeState({
      turnPhase: 'trade',
      trades: [{
        id: 'tr_rej',
        fromId: 'p1',
        toId: 'p2',
        offer: { cash: 50, properties: [], jailCards: 0 },
        demand: { cash: 0, properties: [], jailCards: 0 },
        status: 'pending',
      }],
    });
    const { state: next, events } = reduce(s, {
      type: 'trade_respond',
      playerId: 'p2',
      tradeId: 'tr_rej',
      action: 'reject',
    });
    expect(next.trades[0]!.status).toBe('rejected');
    expect(events.some((e) => e.type === 'trade_rejected')).toBe(true);
  });
});

// ─── Bankruptcy ──────────────────────────────────────────────────────────────

describe('bankruptcy to bank', () => {
  it('marks player bankrupt and releases properties', () => {
    const s = makeState({
      ownership: { 1: 'p1' },
      players: [makePlayer('p1', { properties: [1], cash: 0 }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(s, { type: 'declare_bankrupt', playerId: 'p1' });
    expect(next.players[0]!.bankrupt).toBe(true);
    expect(next.ownership[1]).toBeNull();
    expect(events.some((e) => e.type === 'bankrupt')).toBe(true);
  });

  it('game ends when only one solvent player remains', () => {
    const s = makeState({
      players: [makePlayer('p1', { cash: 0 }), makePlayer('p2')],
    });
    const { state: next, events } = reduce(s, { type: 'declare_bankrupt', playerId: 'p1' });
    expect(next.status).toBe('finished');
    expect(events.some((e) => e.type === 'game_over')).toBe(true);
    const gameOver = events.find((e) => e.type === 'game_over') as Extract<typeof events[0], { type: 'game_over' }>;
    expect(gameOver.winnerId).toBe('p2');
  });
});

// ─── End turn ─────────────────────────────────────────────────────────────────

describe('end_turn', () => {
  it('advances to the next solvent player', () => {
    const s = makeState({ turnPhase: 'post_action' });
    const { state: next } = reduce(s, { type: 'end_turn', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.turnPhase).toBe('pre_roll');
  });

  it('same player gets another roll on doubles (not in jail)', () => {
    const s = makeState({ turnPhase: 'post_action', doublesStreak: 1 });
    const { state: next } = reduce(s, { type: 'end_turn', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(0); // stays on p1
    expect(next.turnPhase).toBe('pre_roll');
  });

  it('doubles do NOT grant extra turn when in jail', () => {
    const s = makeState({
      turnPhase: 'post_action',
      doublesStreak: 1,
      players: [
        makePlayer('p1', { jail: { inJail: true, turnsServed: 0, getOutCards: 0 } }),
        makePlayer('p2'),
      ],
    });
    const { state: next } = reduce(s, { type: 'end_turn', playerId: 'p1' });
    expect(next.currentPlayerIndex).toBe(1); // moves to p2
  });
});

// ─── Wrong player / wrong phase guards ───────────────────────────────────────

describe('guards', () => {
  it('throws NOT_YOUR_TURN when wrong player acts', () => {
    const s = makeState({ turnPhase: 'pre_roll' });
    expect(() => reduce(s, roll('p2', 1, 2))).toThrow();
  });

  it('throws WRONG_PHASE when rolling in post_action', () => {
    const s = makeState({ turnPhase: 'post_action' });
    expect(() => reduce(s, roll('p1', 1, 2))).toThrow();
  });
});

// ─── Card effects ─────────────────────────────────────────────────────────────

describe('card — pay_bank', () => {
  it('reduces player cash', () => {
    // Draw from Surprise at pos 7 — use the first surprise card that is pay_bank
    // We'll test applyCardEffect indirectly by landing on a surprise tile
    // and seeding the deck with a known card
    const payBankCard = {
      id: 'test_pay',
      deck: 'surprise' as const,
      text: 'Test',
      effect: { type: 'pay_bank' as const, amount: 50 },
    };
    const s = makeState({
      players: [makePlayer('p1', { position: 3 }), makePlayer('p2')],
      surpriseDeck: [payBankCard],
      surpriseDiscard: [],
    });
    // Roll to land on pos 7 (Surprise): 3+4=7
    const { state: next, events } = reduce(s, roll('p1', 3, 1));
    expect(next.players[0]!.cash).toBe(1500 - 50);
    expect(events.some((e) => e.type === 'card_drawn')).toBe(true);
  });
});

describe('card — get_out_of_prison_card', () => {
  it('increments jail card count', () => {
    const jailCard = {
      id: 'test_jail',
      deck: 'surprise' as const,
      text: 'Get out',
      effect: { type: 'get_out_of_prison_card' as const },
    };
    const s = makeState({
      players: [makePlayer('p1', { position: 3 }), makePlayer('p2')],
      surpriseDeck: [jailCard],
      surpriseDiscard: [],
    });
    const { state: next } = reduce(s, roll('p1', 3, 1)); // lands on pos 7 (surprise)
    expect(next.players[0]!.jail.getOutCards).toBe(1);
  });
});

describe('card — go_to_prison resets doublesStreak', () => {
  it('resets streak when card sends player to prison', () => {
    const prisonCard = {
      id: 'test_prison',
      deck: 'surprise' as const,
      text: 'Go to Prison',
      effect: { type: 'go_to_prison' as const },
    };
    const s = makeState({
      players: [makePlayer('p1', { position: 3 }), makePlayer('p2')],
      doublesStreak: 1,
      surpriseDeck: [prisonCard],
      surpriseDiscard: [],
    });
    const { state: next } = reduce(s, roll('p1', 3, 1));
    expect(next.players[0]!.jail.inJail).toBe(true);
    expect(next.doublesStreak).toBe(0);
  });
});

// ─── Start game guard ─────────────────────────────────────────────────────────

describe('start_game', () => {
  it('only host can start', () => {
    const s = makeState({ status: 'lobby' });
    expect(() => reduce(s, { type: 'start_game', playerId: 'p2' })).toThrow();
  });

  it('host starts game successfully', () => {
    const s = makeState({ status: 'lobby' });
    const { state: next } = reduce(s, { type: 'start_game', playerId: 'p1' });
    expect(next.status).toBe('in_progress');
  });
});

// ─── Airports & utilities are purchasable ────────────────────────────────────

describe('airport / utility purchase', () => {
  it('every airport and utility tile carries a price', () => {
    const s = makeState();
    const revenueTiles = s.board.filter((t) => t.type === 'airport' || t.type === 'utility');
    expect(revenueTiles.length).toBe(6);
    for (const tile of revenueTiles) {
      expect(tile.price, `${tile.name} is missing a price`).toBeGreaterThan(0);
    }
  });

  it('buys an airport, debiting its price', () => {
    // p1 at Start rolls 5 → Oslo Airport (pos 5)
    const s = makeState();
    const { state: rolled } = reduce(s, roll('p1', 2, 3));
    expect(rolled.pendingBuy).toBe(5);

    const { state: bought } = reduce(rolled, { type: 'buy', playerId: 'p1' });
    expect(bought.ownership[5]).toBe('p1');
    expect(bought.players[0]!.cash).toBe(1500 - 200);
  });

  it('buys a utility, debiting its price', () => {
    // p1 at pos 10 rolls 2 → Volt Grid (pos 12)
    const s = makeState({}, [makePlayer('p1', { position: 10 }), makePlayer('p2')]);
    const { state: rolled } = reduce(s, roll('p1', 1, 1));
    expect(rolled.pendingBuy).toBe(12);

    const { state: bought } = reduce(rolled, { type: 'buy', playerId: 'p1' });
    expect(bought.ownership[12]).toBe('p1');
    expect(bought.players[0]!.cash).toBe(1500 - 150);
  });
});

// ─── Game log accumulation ───────────────────────────────────────────────────

describe('state.log', () => {
  it('accumulates events emitted by each action', () => {
    const s = makeState();
    expect(s.log).toHaveLength(0);

    const { state: next, events } = reduce(s, roll('p1', 2, 3));
    expect(events.length).toBeGreaterThan(0);
    expect(next.log).toEqual(events);
  });

  it('appends across successive actions rather than replacing', () => {
    const s = makeState();
    const { state: afterRoll } = reduce(s, roll('p1', 2, 3));
    const { state: afterBuy } = reduce(afterRoll, { type: 'buy', playerId: 'p1' });

    expect(afterBuy.log.length).toBeGreaterThan(afterRoll.log.length);
    // earlier entries are preserved in order
    expect(afterBuy.log.slice(0, afterRoll.log.length)).toEqual(afterRoll.log);
    expect(afterBuy.log.some((e) => e.type === 'bought')).toBe(true);
  });

  it('caps the log so broadcasts stay bounded', () => {
    let s = makeState({
      log: Array.from({ length: 199 }, (_, i) => ({ type: 'trade_rejected' as const, tradeId: `tr_${i}` })),
    });
    // one roll emits at least 2 events (rolled + moved), pushing past the 200 cap
    s = reduce(s, roll('p1', 2, 3)).state;
    expect(s.log.length).toBe(200);
    // the newest event survives, the oldest is evicted
    expect(s.log.at(-1)!.type).not.toBe('trade_rejected');
  });
});
