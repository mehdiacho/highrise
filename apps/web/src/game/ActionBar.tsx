import type { GameState } from '@richup/shared/types';
import { money } from '../local/theme.js';
import {
  roll,
  buy,
  decline,
  endTurn,
  payJailFine,
  useJailCard,
  passAuction,
  bid,
} from '../local/actions.js';

interface Props {
  state: GameState;
  seatId: string | null;
  onOpenTrade: () => void;
  onOpenBankrupt: () => void;
}

const primary =
  'w-full rounded-xl bg-accent py-3 text-base font-bold text-white shadow-glow transition hover:bg-accent-bright active:scale-[0.98]';
const secondary =
  'flex-1 rounded-xl glass py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10';

export default function ActionBar({ state, seatId, onOpenTrade, onOpenBankrupt }: Props) {
  const cp = state.players[state.currentPlayerIndex];
  const me = state.players.find((p) => p.id === seatId);
  const isMyTurn = cp?.id === seatId;
  const auction = state.auction;
  const amInAuction = auction ? auction.participantIds.includes(seatId ?? '') : false;

  if (state.status !== 'in_progress') return null;

  // ── Auction ────────────────────────────────────────────────────────────────
  if (state.turnPhase === 'auction' && auction && amInAuction && me) {
    const tile = state.board[auction.tilePosition];
    const leader = state.players.find((p) => p.id === auction.currentBidderId);
    return (
      <div className="space-y-3">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Auction</p>
          <p className="text-sm font-semibold text-ink">{tile?.name}</p>
          <p className="tabular mt-1 text-2xl font-bold text-gold">{money(auction.currentBid)}</p>
          <p className="text-xs text-ink-muted">
            {leader ? `high bid · ${leader.name}` : 'no bids yet'}
          </p>
        </div>
        <div className="rounded-lg bg-accent/10 py-1 text-center text-xs font-semibold text-accent-bright">
          {me.name} to bid
        </div>
        <div className="flex gap-2">
          {([2, 10, 100] as const).map((inc) => (
            <button
              key={inc}
              onClick={() => bid(inc)}
              disabled={me.cash < auction.currentBid + inc}
              className="flex-1 rounded-xl bg-accent-deep py-2.5 text-sm font-bold text-white transition hover:bg-accent disabled:opacity-30"
            >
              +{money(inc)}
            </button>
          ))}
        </div>
        <button onClick={() => passAuction()} className="w-full rounded-xl glass py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-white/10">
          Pass
        </button>
      </div>
    );
  }

  if (!isMyTurn || !cp || !me) {
    return <p className="py-2 text-center text-sm text-ink-muted">{cp ? `${cp.name}'s turn…` : 'Waiting…'}</p>;
  }

  // ── In prison ────────────────────────────────────────────────────────────────
  if (state.turnPhase === 'pre_roll' && me.jail.inJail) {
    return (
      <div className="space-y-2">
        <p className="text-center text-sm font-semibold text-gold">🔒 In Prison · turn {me.jail.turnsServed + 1}/3</p>
        <button onClick={() => roll()} className={primary}>
          Roll for Doubles
        </button>
        {me.jail.getOutCards > 0 && (
          <button
            onClick={() => useJailCard()}
            className="w-full rounded-xl bg-gold/20 py-2.5 text-sm font-semibold text-gold transition hover:bg-gold/30"
          >
            Use “Get Out” Card
          </button>
        )}
        <button
          onClick={() => payJailFine()}
          disabled={me.cash < state.settings.jailFine}
          className="w-full rounded-xl glass py-2.5 text-sm font-semibold text-ink transition hover:bg-white/10 disabled:opacity-30"
        >
          Pay {money(state.settings.jailFine)} Fine
        </button>
      </div>
    );
  }

  // ── Pre-roll ─────────────────────────────────────────────────────────────────
  if (state.turnPhase === 'pre_roll') {
    return (
      <button onClick={() => roll()} className={primary}>
        Roll Dice
      </button>
    );
  }

  // ── Buy / auction ────────────────────────────────────────────────────────────
  if (state.turnPhase === 'rolled' && state.pendingBuy !== null) {
    const tile = state.board[state.pendingBuy];
    const canAfford = me.cash >= (tile?.price ?? 0);
    return (
      <div className="space-y-2.5">
        <p className="text-center text-sm text-ink-muted">
          Buy <span className="font-semibold text-ink">{tile?.name}</span> for{' '}
          <span className="font-bold text-gold">{money(tile?.price ?? 0)}</span>?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => buy()}
            disabled={!canAfford}
            className="flex-1 rounded-xl bg-cash py-3 font-bold text-table-950 transition hover:brightness-110 disabled:opacity-30"
          >
            Buy
          </button>
          <button onClick={() => decline()} className={secondary}>
            Auction
          </button>
        </div>
      </div>
    );
  }

  // ── Post-action ──────────────────────────────────────────────────────────────
  if (state.turnPhase === 'post_action') {
    return (
      <div className="space-y-2">
        <div className="flex gap-2">
          <button onClick={onOpenTrade} className={secondary}>
            Trade
          </button>
          <button
            onClick={onOpenBankrupt}
            className="flex-1 rounded-xl bg-danger/15 py-2.5 text-sm font-semibold text-danger transition hover:bg-danger/25"
          >
            Bankrupt
          </button>
        </div>
        <button onClick={() => endTurn()} className={primary}>
          End Turn
        </button>
      </div>
    );
  }

  return null;
}
