import { useEffect, useRef } from 'react';
import type { GameEvent, GameState } from '@richup/shared/types';
import { useGame } from '../local/store.js';
import { playSfx, type SfxName } from './sfx.js';

/**
 * Maps a game event to its sound. `seatId` is the local player (null for a
 * spectator or a shared hot-seat screen) so money events can play as a gain or
 * a loss depending on which side of the transaction this client is on.
 */
function soundFor(ev: GameEvent, seatId: string | null): SfxName | null {
  switch (ev.type) {
    case 'rolled':
      return 'dice';
    case 'moved':
      return 'move';
    case 'passed_start':
      return 'passStart';
    case 'bought':
      return 'buy';
    case 'rent_paid':
      // The owner hears coins land; everyone else hears it leave.
      return ev.ownerId === seatId ? 'rentReceived' : 'rentPaid';
    case 'tax_paid':
      return 'tax';
    case 'card_drawn':
      return 'card';
    case 'auction_started':
      return 'gavel';
    case 'auction_bid':
      return 'bid';
    case 'auction_won':
      return 'auctionWon';
    case 'auction_no_winner':
      return 'auctionDud';
    case 'built':
      return 'build';
    case 'sold_building':
      return 'demolish';
    case 'mortgaged':
      return 'mortgage';
    case 'unmortgaged':
      return 'unmortgage';
    case 'sent_to_prison':
      return 'jailIn';
    case 'released_from_prison':
      return 'jailOut';
    case 'trade_proposed':
      return 'tradeOffer';
    case 'trade_accepted':
      return 'tradeAccepted';
    case 'trade_rejected':
      return 'tradeRejected';
    case 'bankrupt':
      return 'bankrupt';
    case 'game_over':
      return 'victory';
    default:
      return null;
  }
}

/** Sounds fired per batch, so a busy turn stays legible instead of a pile-up. */
const MAX_PER_BATCH = 4;
const STAGGER_MS = 90;

/**
 * Plays a sound for each newly appended entry in `state.log`.
 *
 * The log is capped (the reducer keeps the last 200), so "new" can't be derived
 * from length alone — once at the cap, each append also drops one off the front.
 * Instead we hold the last event we played by identity and resume just after it.
 */
export function useGameSounds(): void {
  const state = useGame((s) => s.state);
  const activeSeatId = useGame((s) => s.activeSeatId);
  const lastPlayed = useRef<GameEvent | null>(null);
  const primed = useRef(false);

  useEffect(() => {
    const log: readonly GameEvent[] = state?.log ?? [];

    if (log.length === 0) {
      lastPlayed.current = null;
      primed.current = false;
      return;
    }

    // First sight of a log (game start, or a spectator joining mid-game): adopt
    // the tail silently rather than replaying every past event at once.
    if (!primed.current) {
      primed.current = true;
      lastPlayed.current = log[log.length - 1] ?? null;
      return;
    }

    const prev = lastPlayed.current;
    let start = log.length - 1;
    if (prev) {
      const idx = log.lastIndexOf(prev);
      start = idx >= 0 ? idx + 1 : log.length - 1; // fell off the cap → play the newest only
    }

    const fresh = log.slice(start).slice(-MAX_PER_BATCH);
    fresh.forEach((ev, i) => {
      const name = soundFor(ev, activeSeatId);
      if (!name) return;
      if (i === 0) playSfx(name);
      else window.setTimeout(() => playSfx(name), i * STAGGER_MS);
    });

    lastPlayed.current = log[log.length - 1] ?? null;
  }, [state?.log, activeSeatId]);
}

/** Convenience for components that only need the state's log identity. */
export type { GameState };
