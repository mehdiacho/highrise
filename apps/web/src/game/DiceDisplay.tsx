const DOTS: Record<number, number[]> = {
  // indices into a 3×3 grid (0..8)
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function DieFace({ value, delay }: { value: number; delay: number }) {
  const dots = DOTS[value] ?? [];
  return (
    <div
      className="grid h-12 w-12 grid-cols-3 grid-rows-3 gap-[3px] rounded-xl bg-gradient-to-br from-white to-slate-200 p-2 shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.9)] animate-dice-tumble"
      style={{ animationDelay: `${delay}ms` }}
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && (
            <div className="h-[7px] w-[7px] rounded-full bg-table-900 shadow-inner" />
          )}
        </div>
      ))}
    </div>
  );
}

interface Props {
  dice: [number, number] | null;
  rolling?: boolean;
  /** Changes each roll so the animation replays. */
  nonce?: number;
}

export default function DiceDisplay({ dice, rolling, nonce = 0 }: Props) {
  if (!dice) {
    return (
      <div className="flex justify-center gap-3 opacity-25">
        <div className="h-12 w-12 rounded-xl bg-white/80" />
        <div className="h-12 w-12 rounded-xl bg-white/80" />
      </div>
    );
  }

  const isDoubles = dice[0] === dice[1];
  const total = dice[0] + dice[1];

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div key={nonce} className="flex justify-center gap-3">
        <DieFace value={dice[0]} delay={0} />
        <DieFace value={dice[1]} delay={70} />
      </div>
      {!rolling && (
        <div className="flex items-center gap-2 text-xs">
          <span className="tabular font-semibold text-ink-muted">rolled {total}</span>
          {isDoubles && (
            <span className="rounded-full bg-gold/15 px-2 py-0.5 font-bold text-gold shadow-glow-gold">
              Doubles!
            </span>
          )}
        </div>
      )}
    </div>
  );
}
