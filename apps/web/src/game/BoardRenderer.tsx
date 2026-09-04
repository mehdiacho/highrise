import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState, Tile } from '@richup/shared/types';
import { GROUP_COLORS, money, monogram } from '../local/theme.js';
import type { TextOrientation } from '../local/store.js';

interface Props {
  state: GameState;
  activeSeatId: string | null;
  orientation: TextOrientation;
  onTileClick: (tilePosition: number) => void;
  center?: ReactNode;
}

// Natural (unscaled) geometry — the whole board is transform-scaled to fit.
const CELL = 58;
const GAP = 3;
const PAD = 8;
const GRID = 11 * CELL + 10 * GAP; // 668 — the grid's own box
const NATURAL = GRID + 2 * PAD; // 684 — the framed board
const TSIZE = 18; // token diameter
const TILES = 40;

type Edge = 'bottom' | 'left' | 'top' | 'right' | null;

/** Which side of the ring a tile sits on (corners → null). */
function edgeOf(pos: number): Edge {
  if (pos === 0 || pos === 10 || pos === 20 || pos === 30) return null;
  if (pos >= 1 && pos <= 9) return 'bottom';
  if (pos >= 11 && pos <= 19) return 'left';
  if (pos >= 21 && pos <= 29) return 'top';
  return 'right';
}

/** Rotation (deg) so a label faces the board center, per edge. */
function inwardRotation(edge: Edge): number {
  switch (edge) {
    case 'top':
      return 180;
    case 'left':
      return 90;
    case 'right':
      return -90;
    default:
      return 0;
  }
}

/** Grid row/col for a board position (mirrors buildGrid's clockwise loop). */
function rowCol(pos: number): [number, number] {
  if (pos >= 0 && pos <= 10) return [10, 10 - pos]; // bottom row
  if (pos >= 11 && pos <= 19) return [9 - (pos - 11), 0]; // left col
  if (pos >= 20 && pos <= 30) return [0, pos - 20]; // top row
  return [1 + (pos - 31), 10]; // right col 31..39
}

/** Center of a tile in grid-local pixels (origin at grid top-left). */
function tileCenter(pos: number): { x: number; y: number } {
  const [r, c] = rowCol(pos);
  return { x: c * (CELL + GAP) + CELL / 2, y: r * (CELL + GAP) + CELL / 2 };
}

const CORNER: Record<string, { icon: string; label: string }> = {
  start: { icon: '🏁', label: 'START' },
  prison: { icon: '🔒', label: 'PRISON' },
  vacation: { icon: '🏖', label: 'VACATION' },
  go_to_prison: { icon: '🚔', label: 'GO TO PRISON' },
};

const SPECIAL: Record<string, { icon: string; label: string }> = {
  surprise: { icon: '❓', label: 'Surprise' },
  treasure: { icon: '💎', label: 'Treasure' },
  income_tax: { icon: '💸', label: 'Income Tax' },
  luxury_tax: { icon: '💎', label: 'Luxury Tax' },
  airport: { icon: '✈', label: 'Airport' },
  utility: { icon: '⚡', label: 'Utility' },
};

function Buildings({ count }: { count: number }) {
  if (count === 0) return null;
  if (count >= 5) {
    return <div className="text-[8px] font-bold leading-none text-gold drop-shadow">🏨</div>;
  }
  return (
    <div className="flex gap-[1px]">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-[5px] w-[5px] rounded-[1px] bg-cash shadow-[0_0_4px_rgba(63,191,111,0.7)]" />
      ))}
    </div>
  );
}

/** Absolutely-positioned color strip on the interior-facing edge. */
function ColorBand({ color, edge }: { color: string; edge: Edge }) {
  const glow = `0 0 8px ${color}55`;
  const base: Record<'bottom' | 'left' | 'top' | 'right', string> = {
    bottom: 'absolute inset-x-0 top-0 h-[10px]',
    top: 'absolute inset-x-0 bottom-0 h-[10px]',
    left: 'absolute inset-y-0 right-0 w-[10px]',
    right: 'absolute inset-y-0 left-0 w-[10px]',
  };
  if (!edge) return null;
  return <div className={base[edge]} style={{ backgroundColor: color, boxShadow: glow }} />;
}

/** Inset the content away from the band so text never sits under it. */
function contentPad(edge: Edge, hasBand: boolean): string {
  if (!hasBand) return 'p-[3px]';
  switch (edge) {
    case 'bottom':
      return 'pt-[11px] pb-[3px] px-[3px]';
    case 'top':
      return 'pb-[11px] pt-[3px] px-[3px]';
    case 'left':
      return 'pr-[11px] pl-[3px] py-[3px]';
    case 'right':
      return 'pl-[11px] pr-[3px] py-[3px]';
    default:
      return 'p-[3px]';
  }
}

function TileCell({
  tile,
  state,
  orientation,
  onClick,
}: {
  tile: Tile;
  state: GameState;
  orientation: TextOrientation;
  onClick: () => void;
}) {
  const ownerId = state.ownership[tile.position] ?? null;
  const owner = ownerId ? state.players.find((p) => p.id === ownerId) : null;
  const buildings = state.buildings[tile.position] ?? 0;
  const isMortgaged = state.mortgaged[tile.position] ?? false;
  const corner = CORNER[tile.type];
  const special = SPECIAL[tile.type];
  const edge = edgeOf(tile.position);
  const hasBand = !!tile.group;
  const rotate = corner ? 0 : orientation === 'inward' ? inwardRotation(edge) : 0;

  return (
    <button
      onClick={onClick}
      className="group relative h-[58px] w-[58px] overflow-hidden rounded-md border border-white/[0.07] bg-gradient-to-b from-table-700/70 to-table-800/90 text-center shadow-tile outline-none transition hover:z-20 hover:border-accent/60 hover:shadow-glow-sm focus:z-20"
      style={owner ? { boxShadow: `inset 0 -3px 0 ${owner.color}` } : undefined}
    >
      {hasBand && <ColorBand color={GROUP_COLORS[tile.group!]} edge={edge} />}

      <div className={`absolute inset-0 flex items-center justify-center ${contentPad(edge, hasBand)}`}>
        <div
          className="flex flex-col items-center justify-center"
          style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}
        >
          {corner ? (
            <>
              <div className="text-base leading-none">{corner.icon}</div>
              <div className="mt-[3px] text-[6.5px] font-bold tracking-wide text-ink-muted">{corner.label}</div>
            </>
          ) : special ? (
            <>
              <div className="text-[13px] leading-none">{special.icon}</div>
              <div className="mt-[2px] text-[7px] font-semibold leading-tight text-ink">
                {tile.type === 'airport' || tile.type === 'utility' ? tile.name : special.label}
              </div>
              {tile.price != null && !owner && (
                <div className="text-[7px] font-semibold text-gold">{money(tile.price)}</div>
              )}
            </>
          ) : (
            <>
              <div className="max-w-[52px] text-[7.5px] font-semibold leading-[1.15] text-ink line-clamp-2">
                {tile.name}
              </div>
              {tile.price != null && !owner && (
                <div className="mt-[1px] text-[7px] font-semibold text-gold">{money(tile.price)}</div>
              )}
            </>
          )}

          {buildings > 0 && (
            <div className="mt-[2px] flex h-[6px] items-center">
              <Buildings count={buildings} />
            </div>
          )}
        </div>
      </div>

      {isMortgaged && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-table-950/70 backdrop-grayscale">
          <span className="rotate-[-12deg] text-[8px] font-bold tracking-wider text-danger">MORTGAGED</span>
        </div>
      )}
    </button>
  );
}

type MovingPlayer = { id: string; color: string; name: string; position: number };

/**
 * Advance each token toward its real tile one adjacent step at a time so it
 * hops along the ring. A short forward move (≤12, a dice roll) walks tile by
 * tile; a big jump (a teleport / card move) slides straight there.
 */
function useHoppingPositions(players: MovingPlayer[]): Record<string, number> {
  const [display, setDisplay] = useState<Record<string, number>>(() =>
    Object.fromEntries(players.map((p) => [p.id, p.position])),
  );
  const playersRef = useRef(players);
  playersRef.current = players;

  useEffect(() => {
    const id = window.setInterval(() => {
      setDisplay((prev) => {
        const ps = playersRef.current;
        let changed = false;
        const next: Record<string, number> = { ...prev };
        for (const p of ps) {
          const cur = next[p.id];
          if (cur == null) {
            next[p.id] = p.position; // new seat — snap in
            changed = true;
            continue;
          }
          if (cur === p.position) continue;
          const forward = (p.position - cur + TILES) % TILES;
          next[p.id] = forward >= 1 && forward <= 12 ? (cur + 1) % TILES : p.position;
          changed = true;
        }
        return changed ? next : prev;
      });
    }, 130);
    return () => window.clearInterval(id);
  }, []);

  return display;
}

/** One overlay layer holding every token, positioned over the grid. */
function TokenLayer({ players, activeSeatId }: { players: MovingPlayer[]; activeSeatId: string | null }) {
  const display = useHoppingPositions(players);

  // Cluster tokens that currently share a tile so they don't fully overlap.
  const byTile: Record<number, string[]> = {};
  for (const p of players) {
    const pos = display[p.id] ?? p.position;
    (byTile[pos] ??= []).push(p.id);
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30">
      {players.map((p) => {
        const pos = display[p.id] ?? p.position;
        const { x, y } = tileCenter(pos);
        const group = byTile[pos]!;
        const idx = group.indexOf(p.id);
        const n = group.length;
        const perRow = Math.ceil(Math.sqrt(n));
        const rows = Math.ceil(n / perRow);
        const col = idx % perRow;
        const row = Math.floor(idx / perRow);
        const ox = (col - (perRow - 1) / 2) * 11;
        const oy = (row - (rows - 1) / 2) * 11;
        const left = x - TSIZE / 2 + ox;
        const top = y - TSIZE / 2 + oy;
        return (
          <div
            key={p.id}
            className={`absolute flex items-center justify-center rounded-full text-[8px] font-bold text-table-950 ring-2 ring-black/40 ${
              p.id === activeSeatId ? 'animate-pulse-ring' : ''
            }`}
            style={{
              width: TSIZE,
              height: TSIZE,
              backgroundColor: p.color,
              transform: `translate(${left}px, ${top}px)`,
              transition: 'transform 120ms linear',
              zIndex: p.id === activeSeatId ? 2 : 1,
            }}
            title={p.name}
          >
            {monogram(p.name).slice(0, 1)}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Classic 11×11 loop. Positions run clockwise from Start (bottom-right corner).
 */
function buildGrid(board: Tile[]): (Tile | null)[][] {
  const grid: (Tile | null)[][] = Array.from({ length: 11 }, () => Array(11).fill(null));
  for (let i = 0; i <= 10; i++) grid[10]![10 - i] = board[i] ?? null; // bottom row 0..10
  for (let i = 0; i < 9; i++) grid[9 - i]![0] = board[11 + i] ?? null; // left col 11..19
  for (let i = 0; i <= 10; i++) grid[0]![i] = board[20 + i] ?? null; // top row 20..30
  for (let i = 0; i < 9; i++) grid[1 + i]![10] = board[31 + i] ?? null; // right col 31..39
  return grid;
}

/**
 * Measure the available area and scale the natural-size board to fit, so its
 * top and bottom hug the viewport. Capped by width so it never overflows the
 * board column.
 */
function useFitScale() {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      setScale(Math.max(0.2, Math.min(width, height) / NATURAL));
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    window.addEventListener('resize', compute);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', compute);
    };
  }, []);
  return { ref, scale };
}

export default function BoardRenderer({ state, activeSeatId, orientation, onTileClick, center }: Props) {
  const grid = buildGrid(state.board);
  const { ref, scale } = useFitScale();
  const size = NATURAL * scale;

  const tokens: MovingPlayer[] = state.players
    .filter((p) => !p.bankrupt)
    .map((p) => ({ id: p.id, color: p.color, name: p.name, position: p.position }));

  return (
    <div ref={ref} className="flex h-full w-full items-center justify-center">
      <div style={{ width: size, height: size }}>
        <div
          className="relative rounded-2xl border border-white/10 bg-table-950/60 shadow-panel"
          style={{
            width: NATURAL,
            height: NATURAL,
            padding: PAD,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Center console fills the inner playfield */}
          {center && (
            <div className="pointer-events-none absolute inset-[70px] flex items-center justify-center">
              <div className="pointer-events-auto">{center}</div>
            </div>
          )}

          {/* Grid + token overlay share one exact GRID×GRID coordinate box */}
          <div className="relative" style={{ width: GRID, height: GRID }}>
            <div className="grid grid-cols-[repeat(11,58px)] gap-[3px]">
              {grid.flatMap((row, ri) =>
                row.map((tile, ci) => {
                  if (!tile) return <div key={`${ri}-${ci}`} />;
                  return (
                    <TileCell
                      key={tile.position}
                      tile={tile}
                      state={state}
                      orientation={orientation}
                      onClick={() => onTileClick(tile.position)}
                    />
                  );
                }),
              )}
            </div>

            <TokenLayer players={tokens} activeSeatId={activeSeatId} />
          </div>
        </div>
      </div>
    </div>
  );
}
