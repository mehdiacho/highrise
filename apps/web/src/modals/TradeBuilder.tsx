import { useState } from 'react';
import type { GameState, TradeAssets } from '@richup/shared/types';
import { tradeCreate } from '../local/actions.js';
import { GROUP_COLORS, money } from '../local/theme.js';

interface Props {
  state: GameState;
  myPlayerId: string;
  onClose: () => void;
}

const EMPTY_ASSETS: TradeAssets = { cash: 0, properties: [], jailCards: 0 };

function swatchColor(state: GameState, pos: number): string {
  const tile = state.board[pos];
  if (tile?.group) return GROUP_COLORS[tile.group];
  if (tile?.type === 'airport') return '#9aa4bf';
  if (tile?.type === 'utility') return '#f5c542';
  return '#5b6480';
}

export default function TradeBuilder({ state, myPlayerId, onClose }: Props) {
  const [targetId, setTargetId] = useState('');
  const [offer, setOffer] = useState<TradeAssets>(EMPTY_ASSETS);
  const [demand, setDemand] = useState<TradeAssets>(EMPTY_ASSETS);

  const me = state.players.find((p) => p.id === myPlayerId);
  const targets = state.players.filter((p) => p.id !== myPlayerId && !p.bankrupt);
  const target = state.players.find((p) => p.id === targetId);

  function toggleProperty(side: 'offer' | 'demand', pos: number) {
    const setter = side === 'offer' ? setOffer : setDemand;
    setter((prev) => {
      const has = prev.properties.includes(pos);
      return {
        ...prev,
        properties: has ? prev.properties.filter((p) => p !== pos) : [...prev.properties, pos],
      };
    });
  }

  function handleSubmit() {
    if (!targetId) return;
    tradeCreate(targetId, offer, demand);
    onClose();
  }

  function PropertyRow({
    pos,
    side,
    checked,
  }: {
    pos: number;
    side: 'offer' | 'demand';
    checked: boolean;
  }) {
    const tile = state.board[pos];
    return (
      <label
        className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-xs transition ${
          checked ? 'bg-accent/15 text-ink' : 'text-ink-muted hover:bg-white/5'
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleProperty(side, pos)}
          className="accent-accent"
        />
        <span className="h-2.5 w-2.5 shrink-0 rounded-[2px]" style={{ backgroundColor: swatchColor(state, pos) }} />
        <span className="truncate">{tile?.name}</span>
      </label>
    );
  }

  const emptyTrade =
    offer.cash === 0 &&
    offer.properties.length === 0 &&
    offer.jailCards === 0 &&
    demand.cash === 0 &&
    demand.properties.length === 0 &&
    demand.jailCards === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-table-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass max-h-[90vh] w-96 space-y-4 overflow-y-auto rounded-2xl p-5 shadow-panel animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink">Propose Trade</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-1.5 text-lg leading-none text-ink-faint transition hover:bg-white/5 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Target picker */}
        <div>
          <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            Trade with
          </label>
          <div className="flex flex-wrap gap-2">
            {targets.map((p) => {
              const active = targetId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setTargetId(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? 'bg-accent text-white shadow-glow-sm'
                      : 'border border-white/10 bg-white/5 text-ink-muted hover:bg-white/10 hover:text-ink'
                  }`}
                >
                  <div className="h-3 w-3 rounded-full ring-1 ring-black/40" style={{ backgroundColor: p.color }} />
                  {p.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* My offer */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-table-950/40 p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-cash">I give</h3>
            <div>
              <label className="text-[11px] text-ink-faint">Cash</label>
              <input
                type="number"
                min={0}
                max={me?.cash ?? 0}
                value={offer.cash}
                onChange={(e) => setOffer((o) => ({ ...o, cash: Number(e.target.value) }))}
                className="w-full rounded-lg border border-white/10 bg-table-900 px-2 py-1 text-sm text-ink outline-none focus:border-accent/60"
              />
            </div>
            <div className="space-y-0.5">
              {(me?.properties ?? []).map((pos) => (
                <PropertyRow key={pos} pos={pos} side="offer" checked={offer.properties.includes(pos)} />
              ))}
              {(me?.properties ?? []).length === 0 && (
                <p className="px-1 text-[11px] text-ink-faint">No properties</p>
              )}
            </div>
            {(me?.jail.getOutCards ?? 0) > 0 && (
              <label className="flex cursor-pointer items-center gap-2 px-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={offer.jailCards > 0}
                  onChange={(e) => setOffer((o) => ({ ...o, jailCards: e.target.checked ? 1 : 0 }))}
                  className="accent-accent"
                />
                <span>🔑 Prison card</span>
              </label>
            )}
          </div>

          {/* My demand */}
          <div className="space-y-2 rounded-xl border border-white/10 bg-table-950/40 p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-gold">I want</h3>
            <div>
              <label className="text-[11px] text-ink-faint">Cash</label>
              <input
                type="number"
                min={0}
                value={demand.cash}
                onChange={(e) => setDemand((d) => ({ ...d, cash: Number(e.target.value) }))}
                className="w-full rounded-lg border border-white/10 bg-table-900 px-2 py-1 text-sm text-ink outline-none focus:border-accent/60"
              />
            </div>
            <div className="space-y-0.5">
              {!target && <p className="px-1 text-[11px] text-ink-faint">Pick a player</p>}
              {(target?.properties ?? []).map((pos) => (
                <PropertyRow key={pos} pos={pos} side="demand" checked={demand.properties.includes(pos)} />
              ))}
              {target && (target?.properties ?? []).length === 0 && (
                <p className="px-1 text-[11px] text-ink-faint">No properties</p>
              )}
            </div>
            {(target?.jail.getOutCards ?? 0) > 0 && (
              <label className="flex cursor-pointer items-center gap-2 px-2 text-xs text-ink-muted">
                <input
                  type="checkbox"
                  checked={demand.jailCards > 0}
                  onChange={(e) => setDemand((d) => ({ ...d, jailCards: e.target.checked ? 1 : 0 }))}
                  className="accent-accent"
                />
                <span>🔑 Prison card</span>
              </label>
            )}
          </div>
        </div>

        {/* Summary */}
        {targetId && !emptyTrade && (
          <p className="rounded-lg bg-white/[0.04] px-3 py-2 text-center text-xs text-ink-muted">
            Give <span className="font-semibold text-cash">{money(offer.cash)}</span> + {offer.properties.length} props
            {' · '}for{' '}
            <span className="font-semibold text-gold">{money(demand.cash)}</span> + {demand.properties.length} props
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetId || emptyTrade}
            className="flex-1 rounded-xl bg-accent py-2 text-sm font-bold text-white shadow-glow-sm transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Propose
          </button>
        </div>
      </div>
    </div>
  );
}
