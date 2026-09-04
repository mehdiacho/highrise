import { useState } from 'react';
import { useGame } from '../local/store.js';
import { monogram } from '../local/theme.js';

function KindTag({ kind, isBot }: { kind?: string; isBot: boolean }) {
  const label = kind === 'ai' ? 'AI' : kind === 'bot' || isBot ? 'BOT' : null;
  if (!label) return null;
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
        label === 'AI' ? 'bg-gold/90 text-table-950' : 'bg-accent/90 text-white'
      }`}
    >
      {label}
    </span>
  );
}

export default function WaitingRoom() {
  const state = useGame((s) => s.state);
  const myPlayerId = useGame((s) => s.myPlayerId);
  const roomCode = useGame((s) => s.roomCode);
  const startOnline = useGame((s) => s.startOnline);
  const addBotOnline = useGame((s) => s.addBotOnline);
  const quit = useGame((s) => s.quit);
  const error = useGame((s) => s.error);

  const [copied, setCopied] = useState(false);

  if (!state) return null;

  const me = state.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const canStart = state.players.length >= 2;
  const full = state.players.length >= state.settings.maxPlayers;

  const copyCode = async () => {
    const code = roomCode ?? state.roomCode;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="glass flex max-h-[86vh] w-full max-w-lg flex-col rounded-3xl p-8 shadow-panel animate-rise">
      <div className="text-center">
        <p className="text-sm text-ink-muted">Waiting room</p>
        <button
          onClick={copyCode}
          className="group mt-2 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-table-900 px-4 py-2 transition hover:border-accent/50"
          title="Copy room code"
        >
          <span className="text-2xl font-black uppercase tracking-[0.35em] text-ink">
            {roomCode ?? state.roomCode}
          </span>
          <span className="text-xs font-semibold text-ink-faint group-hover:text-accent">
            {copied ? 'Copied!' : 'Copy'}
          </span>
        </button>
        <p className="mt-2 text-xs text-ink-faint">Share this code so others can join.</p>
      </div>

      <div className="mt-6 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {state.players.map((p) => (
          <div key={p.id} className="glass flex items-center gap-3 rounded-2xl px-3 py-2.5">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-table-950"
              style={{ backgroundColor: p.color }}
            >
              {monogram(p.name)}
            </div>
            <span className="min-w-0 flex-1 truncate text-base font-medium text-ink">
              {p.name}
              {p.id === myPlayerId && <span className="ml-2 text-xs text-ink-faint">(you)</span>}
            </span>
            <KindTag kind={p.kind} isBot={p.isBot} />
            {p.isHost && (
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-ink-muted">
                HOST
              </span>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-center text-xs text-ink-faint">
        {state.players.length} / {state.settings.maxPlayers} players
      </p>

      {error && <p className="mt-2 text-center text-sm font-medium text-danger">{error}</p>}

      {isHost ? (
        <div className="mt-4 space-y-2">
          <button
            onClick={addBotOnline}
            disabled={full}
            className="w-full rounded-xl border border-dashed border-white/15 py-2.5 text-sm font-semibold text-ink-muted transition hover:border-white/30 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
          >
            {full ? 'Room full' : '+ Add bot'}
          </button>
          <button
            onClick={startOnline}
            disabled={!canStart}
            className="w-full rounded-xl bg-accent py-3.5 text-base font-bold text-white shadow-glow transition hover:bg-accent-bright active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {canStart ? 'Start Game' : 'Need 2+ players'}
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-white/10 bg-table-900 py-3.5 text-center text-sm font-medium text-ink-muted">
          Waiting for the host to start…
        </div>
      )}

      <button
        onClick={quit}
        className="mt-3 w-full rounded-xl py-2 text-sm font-semibold text-ink-faint transition hover:text-danger"
      >
        Leave room
      </button>
    </div>
  );
}
