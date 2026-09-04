import { useState } from 'react';
import { useGame } from '../local/store.js';
import { PLAYER_COLORS, monogram } from '../local/theme.js';

export default function OnlineSetup() {
  const createOnline = useGame((s) => s.createOnline);
  const joinOnline = useGame((s) => s.joinOnline);
  const connecting = useGame((s) => s.connecting);
  const error = useGame((s) => s.error);

  const [name, setName] = useState('');
  const [color, setColor] = useState(PLAYER_COLORS[0]!);
  const [code, setCode] = useState('');

  const trimmed = name.trim();
  const canCreate = trimmed.length > 0 && !connecting;
  const canJoin = canCreate && code.trim().length >= 4;

  return (
    <div className="glass w-full max-w-md space-y-5 rounded-3xl p-8 shadow-panel animate-rise">
      <p className="text-center text-sm text-ink-muted">Play online · create a room or join with a code</p>

      {/* Identity */}
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-table-950"
          style={{ backgroundColor: color }}
        >
          {monogram(trimmed || 'You')}
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={24}
          spellCheck={false}
          placeholder="Your name"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-table-900 px-3 py-2.5 text-base font-medium text-ink outline-none placeholder:text-ink-faint focus:border-accent/60"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {PLAYER_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full transition ${
              color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-table-800' : 'opacity-70 hover:opacity-100'
            }`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <button
        onClick={() => createOnline(trimmed, color)}
        disabled={!canCreate}
        className="w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white shadow-glow transition hover:bg-accent-bright active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        {connecting ? 'Connecting…' : 'Create Room'}
      </button>

      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <div className="h-px flex-1 bg-white/10" />
        or join
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          spellCheck={false}
          placeholder="ROOM CODE"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-table-900 px-3 py-2.5 text-center text-base font-bold uppercase tracking-[0.3em] text-ink outline-none placeholder:tracking-normal placeholder:text-ink-faint focus:border-accent/60"
        />
        <button
          onClick={() => joinOnline(code.trim(), trimmed, color)}
          disabled={!canJoin}
          className="shrink-0 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-bold text-ink transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Join
        </button>
      </div>

      <p className="text-center text-xs text-ink-faint">
        Joining a game that has already started? You&rsquo;ll watch as a spectator.
      </p>

      {error && <p className="text-center text-sm font-medium text-danger">{error}</p>}
    </div>
  );
}
