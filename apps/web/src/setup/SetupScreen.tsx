import { useState } from 'react';
import type { PlayerKind } from '@richup/shared/types';
import { useGame } from '../local/store.js';
import { MAX_PLAYERS } from '../local/engine.js';
import { PLAYER_COLORS, monogram } from '../local/theme.js';

interface Seat {
  name: string;
  color: string;
  kind: PlayerKind;
}

const MIN_SEATS = 2;

const KINDS: { value: PlayerKind; label: string; hint: string }[] = [
  { value: 'human', label: 'Human', hint: 'A person takes this seat' },
  { value: 'bot', label: 'Bot', hint: 'Pre-written algorithm' },
  { value: 'ai', label: 'AI', hint: 'Live model — full board context' },
];

function defaultName(kind: PlayerKind, i: number): string {
  if (kind === 'bot') return `Bot ${i + 1}`;
  if (kind === 'ai') return `AI ${i + 1}`;
  return `Player ${i + 1}`;
}

function defaultSeats(): Seat[] {
  return [
    { name: 'Player 1', color: PLAYER_COLORS[0]!, kind: 'human' },
    { name: 'Player 2', color: PLAYER_COLORS[1]!, kind: 'human' },
  ];
}

export default function SetupScreen() {
  const start = useGame((s) => s.start);
  const [seats, setSeats] = useState<Seat[]>(defaultSeats);

  const setName = (i: number, name: string) =>
    setSeats((prev) => prev.map((s, idx) => (idx === i ? { ...s, name } : s)));

  const setColor = (i: number, color: string) =>
    setSeats((prev) => prev.map((s, idx) => (idx === i ? { ...s, color } : s)));

  const setKind = (i: number, kind: PlayerKind) =>
    setSeats((prev) =>
      prev.map((s, idx) => {
        if (idx !== i) return s;
        // If the name still looks auto-generated, refresh it to match the kind.
        const auto = /^(Player|Bot|AI) \d+$/.test(s.name.trim());
        return { ...s, kind, name: auto ? defaultName(kind, idx) : s.name };
      }),
    );

  const addSeat = () =>
    setSeats((prev) => {
      if (prev.length >= MAX_PLAYERS) return prev;
      const used = new Set(prev.map((s) => s.color));
      const color = PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[prev.length % PLAYER_COLORS.length]!;
      return [...prev, { name: `Player ${prev.length + 1}`, color, kind: 'human' }];
    });

  const removeSeat = (i: number) =>
    setSeats((prev) => (prev.length <= MIN_SEATS ? prev : prev.filter((_, idx) => idx !== i)));

  const colorTaken = (color: string, self: number) =>
    seats.some((s, idx) => idx !== self && s.color === color);

  const handleStart = () => {
    start(
      seats.map((s, i) => ({
        name: s.name.trim() || defaultName(s.kind, i),
        color: s.color,
        kind: s.kind,
      })),
    );
  };

  const humans = seats.filter((s) => s.kind === 'human').length;
  const bots = seats.filter((s) => s.kind === 'bot').length;
  const ais = seats.filter((s) => s.kind === 'ai').length;

  return (
    <div className="glass flex max-h-[86vh] w-full max-w-xl flex-col rounded-3xl p-8 shadow-panel animate-rise">
        <div className="mb-1 text-center">
          <p className="text-sm text-ink-muted">Pass &amp; play · one screen, take turns</p>
        </div>

        <div className="mt-6 min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-1">
          {seats.map((seat, i) => (
            <div key={i} className="glass rounded-2xl px-3 py-2.5">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-table-950"
                  style={{ backgroundColor: seat.color }}
                >
                  {monogram(seat.name)}
                </div>

                <input
                  value={seat.name}
                  onChange={(e) => setName(i, e.target.value)}
                  maxLength={24}
                  spellCheck={false}
                  className="min-w-0 flex-1 bg-transparent text-base font-medium text-ink outline-none placeholder:text-ink-faint"
                  placeholder={defaultName(seat.kind, i)}
                />

                {/* Kind selector */}
                <div className="flex shrink-0 overflow-hidden rounded-lg border border-white/10 text-[11px] font-semibold">
                  {KINDS.map((k) => {
                    const active = seat.kind === k.value;
                    return (
                      <button
                        key={k.value}
                        onClick={() => setKind(i, k.value)}
                        title={k.hint}
                        className={`px-2 py-1 transition ${
                          active
                            ? k.value === 'ai'
                              ? 'bg-gold/90 text-table-950'
                              : k.value === 'bot'
                                ? 'bg-accent/90 text-white'
                                : 'bg-white/15 text-ink'
                            : 'text-ink-faint hover:bg-white/5 hover:text-ink-muted'
                        }`}
                      >
                        {k.label}
                      </button>
                    );
                  })}
                </div>

                {seats.length > MIN_SEATS && (
                  <button
                    onClick={() => removeSeat(i)}
                    className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-ink-faint transition hover:bg-white/5 hover:text-danger"
                    aria-label="Remove player"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Color chips */}
              <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-[52px]">
                {PLAYER_COLORS.map((c) => {
                  const active = seat.color === c;
                  const taken = colorTaken(c, i);
                  return (
                    <button
                      key={c}
                      onClick={() => !taken && setColor(i, c)}
                      disabled={taken && !active}
                      title={taken && !active ? 'Taken' : undefined}
                      className={`h-5 w-5 rounded-full transition ${
                        active
                          ? 'ring-2 ring-white ring-offset-2 ring-offset-table-800'
                          : taken
                            ? 'cursor-not-allowed opacity-20'
                            : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={addSeat}
            disabled={seats.length >= MAX_PLAYERS}
            className="flex-1 rounded-xl border border-dashed border-white/15 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-white/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            {seats.length >= MAX_PLAYERS ? 'Max 12 players' : '+ Add player'}
          </button>
        </div>

        <button
          onClick={handleStart}
          className="mt-4 w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white shadow-glow transition hover:bg-accent-bright active:scale-[0.99]"
        >
          Start Game
        </button>

        <p className="mt-3 text-center text-xs text-ink-faint">
          {seats.length} seats · {humans} human{humans === 1 ? '' : 's'}
          {bots > 0 && ` · ${bots} bot${bots === 1 ? '' : 's'}`}
          {ais > 0 && ` · ${ais} AI`} · ${'1,500'} each
        </p>
    </div>
  );
}
