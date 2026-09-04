import { useState } from 'react';
import { useGame } from '../local/store.js';
import { respondTrade } from '../local/actions.js';
import { money, monogram } from '../local/theme.js';
import BoardRenderer from './BoardRenderer.js';
import PlayerPanel from './PlayerPanel.js';
import DiceDisplay from './DiceDisplay.js';
import ActionBar from './ActionBar.js';
import EventLog, { formatEvent } from './EventLog.js';
import PropertyDetail from '../modals/PropertyDetail.js';
import TradeBuilder from '../modals/TradeBuilder.js';
import BankruptConfirm from '../modals/BankruptConfirm.js';
import { useGameSounds } from '../audio/useGameSounds.js';
import { isSoundEnabled, setSoundEnabled, playSfx } from '../audio/sfx.js';

/** Fading one-line ticker of the most recent action, under the centerpiece. */
function CenterTicker() {
  const state = useGame((s) => s.state)!;
  const last = state.log[state.log.length - 1];
  if (!last) return null;
  return (
    <div
      // Re-key on log length so each new event replays the fade.
      key={state.log.length}
      className="pointer-events-none mt-2 max-w-[220px] animate-ticker rounded-xl bg-table-950/70 px-3 py-1.5 text-center text-[11px] font-medium leading-snug text-ink shadow-panel backdrop-blur"
    >
      {formatEvent(last, state)}
    </div>
  );
}

function CenterConsole() {
  const state = useGame((s) => s.state)!;
  const rolling = useGame((s) => s.rolling);
  const nonce = useGame((s) => s.rollNonce);
  const cp = state.players[state.currentPlayerIndex];
  const inAuction = state.turnPhase === 'auction';

  return (
    <div className="flex flex-col items-center">
      <div className="glass flex w-44 flex-col items-center gap-3 rounded-2xl px-5 py-4 text-center shadow-panel">
        <div className="font-display text-lg font-bold tracking-tight text-ink">
          HIGH<span className="text-accent">RISE</span>
        </div>

        {inAuction ? (
          <div className="text-xs font-semibold uppercase tracking-wider text-gold">Auction</div>
        ) : (
          cp && (
            <div className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-table-950"
                style={{ backgroundColor: cp.color }}
              >
                {monogram(cp.name)}
              </div>
              <span className="max-w-[90px] truncate text-sm font-semibold text-ink">{cp.name}</span>
            </div>
          )
        )}

        <DiceDisplay dice={state.dice} rolling={rolling} nonce={nonce} />
      </div>

      <CenterTicker />
    </div>
  );
}

function OrientationToggle() {
  const orientation = useGame((s) => s.boardSettings.textOrientation);
  const setBoardSettings = useGame((s) => s.setBoardSettings);
  const opts: { value: 'uniform' | 'inward'; label: string; hint: string }[] = [
    { value: 'uniform', label: 'Uniform', hint: 'All labels read left-to-right' },
    { value: 'inward', label: 'Inward', hint: 'Labels face the board center' },
  ];
  return (
    <div className="flex overflow-hidden rounded-lg border border-white/10 text-[11px] font-semibold">
      {opts.map((o) => (
        <button
          key={o.value}
          title={o.hint}
          onClick={() => setBoardSettings({ textOrientation: o.value })}
          className={`px-2.5 py-1 transition ${
            orientation === o.value ? 'bg-white/15 text-ink' : 'text-ink-faint hover:bg-white/5 hover:text-ink-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SoundToggle() {
  const [on, setOn] = useState(isSoundEnabled);
  return (
    <button
      onClick={() => {
        const next = !on;
        setSoundEnabled(next);
        setOn(next);
        if (next) playSfx('click'); // confirm audibly that it's back on
      }}
      title={on ? 'Mute sound' : 'Unmute sound'}
      aria-label={on ? 'Mute sound' : 'Unmute sound'}
      className="rounded-lg glass px-2.5 py-1.5 text-xs transition hover:bg-white/10"
    >
      {on ? '🔊' : '🔇'}
    </button>
  );
}

export default function HotSeatGame() {
  const state = useGame((s) => s.state)!;
  const activeSeatId = useGame((s) => s.activeSeatId);
  const isSpectator = useGame((s) => s.isSpectator);

  useGameSounds();
  const orientation = useGame((s) => s.boardSettings.textOrientation);
  const error = useGame((s) => s.error);
  const clearError = useGame((s) => s.clearError);
  const quit = useGame((s) => s.quit);

  const [selectedTile, setSelectedTile] = useState<number | null>(null);
  const [showTrade, setShowTrade] = useState(false);
  const [showBankrupt, setShowBankrupt] = useState(false);

  const pendingTrade = state.trades.find((t) => t.status === 'pending');
  const fromP = pendingTrade && state.players.find((p) => p.id === pendingTrade.fromId);
  const toP = pendingTrade && state.players.find((p) => p.id === pendingTrade.toId);

  const winner =
    state.status === 'finished' ? state.players.find((p) => !p.bankrupt) ?? null : null;

  return (
    <div className="flex h-full flex-col p-4">
      {/* Header */}
      <header className="mb-3 flex items-center justify-between px-1">
        <div className="text-sm font-semibold text-ink-muted">
          Turn <span className="text-ink">{state.players[state.currentPlayerIndex]?.name}</span>
          <span className="mx-2 text-ink-faint">·</span>
          <span className="capitalize text-ink-faint">{state.turnPhase.replace('_', ' ')}</span>
          {isSpectator && (
            <span className="ml-3 rounded-md bg-gold/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-table-950">
              Spectating
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[11px] font-medium text-ink-faint sm:inline">Text</span>
          <OrientationToggle />
          <SoundToggle />
          <button
            onClick={quit}
            className="rounded-lg glass px-3 py-1.5 text-xs font-semibold text-ink-muted transition hover:bg-white/10 hover:text-ink"
          >
            {isSpectator ? 'Leave' : 'New Game'}
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-stretch justify-center gap-5">
        {/* Board — fills the available height, top & bottom hug the viewport */}
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
          <BoardRenderer
            state={state}
            activeSeatId={activeSeatId}
            orientation={orientation}
            onTileClick={setSelectedTile}
            center={<CenterConsole />}
          />
        </div>

        {/* Right rail */}
        <div className="flex h-full w-80 shrink-0 flex-col gap-3">
          <div className="glass rounded-2xl p-4 shadow-panel">
            <ActionBar
              state={state}
              seatId={activeSeatId}
              onOpenTrade={() => setShowTrade(true)}
              onOpenBankrupt={() => setShowBankrupt(true)}
            />
          </div>

          <PlayerPanel state={state} activeSeatId={activeSeatId} />

          <EventLog state={state} />
        </div>
      </div>

      {/* Error toast */}
      {error && (
        <div
          className="fixed right-4 top-4 z-50 cursor-pointer rounded-xl bg-danger/90 px-4 py-3 text-sm font-medium text-white shadow-panel animate-rise"
          onClick={clearError}
        >
          {error} <span className="ml-2 opacity-70">✕</span>
        </div>
      )}

      {/* Trade offer */}
      {pendingTrade && toP && fromP && (
        <div className="glass fixed left-1/2 top-4 z-40 w-80 -translate-x-1/2 space-y-2 rounded-2xl p-4 shadow-panel animate-rise">
          <p className="text-sm font-semibold text-ink">
            <span style={{ color: fromP.color }}>{fromP.name}</span> offers{' '}
            <span style={{ color: toP.color }}>{toP.name}</span> a trade
          </p>
          <p className="text-xs text-ink-muted">
            Gives {money(pendingTrade.offer.cash)} + {pendingTrade.offer.properties.length} props · wants{' '}
            {money(pendingTrade.demand.cash)} + {pendingTrade.demand.properties.length} props
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => respondTrade(pendingTrade.id, 'accept', pendingTrade.toId)}
              className="flex-1 rounded-lg bg-cash py-1.5 text-sm font-bold text-table-950 hover:brightness-110"
            >
              Accept
            </button>
            <button
              onClick={() => respondTrade(pendingTrade.id, 'reject', pendingTrade.toId)}
              className="flex-1 rounded-lg glass py-1.5 text-sm font-semibold text-ink hover:bg-white/10"
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* Game over */}
      {state.status === 'finished' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-table-950/80 backdrop-blur-sm">
          <div className="glass rounded-3xl p-8 text-center shadow-panel animate-pop-in">
            <div className="text-5xl">🏆</div>
            <h2 className="mt-3 font-display text-2xl font-bold text-ink">
              {winner?.name ?? 'Someone'} wins!
            </h2>
            <p className="mt-1 text-sm text-ink-muted">Last player standing.</p>
            <button
              onClick={quit}
              className="mt-6 rounded-xl bg-accent px-6 py-3 font-bold text-white shadow-glow hover:bg-accent-bright"
            >
              New Game
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {selectedTile !== null && (
        <PropertyDetail
          tilePosition={selectedTile}
          state={state}
          myPlayerId={activeSeatId}
          onClose={() => setSelectedTile(null)}
        />
      )}
      {showTrade && activeSeatId && (
        <TradeBuilder state={state} myPlayerId={activeSeatId} onClose={() => setShowTrade(false)} />
      )}
      {showBankrupt && <BankruptConfirm onClose={() => setShowBankrupt(false)} />}
    </div>
  );
}
