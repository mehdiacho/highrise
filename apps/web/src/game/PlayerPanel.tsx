import type { GameState, Player } from '@richup/shared/types';
import { GROUP_COLORS, money, monogram } from '../local/theme.js';

interface Props {
  state: GameState;
  activeSeatId: string | null;
}

function swatchColor(state: GameState, pos: number): string {
  const tile = state.board[pos];
  if (tile?.group) return GROUP_COLORS[tile.group];
  if (tile?.type === 'airport') return '#9aa4bf';
  if (tile?.type === 'utility') return '#f5c542';
  return '#5b6480';
}

/** BOT / AI pill next to the name; humans get nothing. */
function KindBadge({ player }: { player: Player }) {
  const kind = player.kind ?? (player.isBot ? 'bot' : 'human');
  if (kind === 'human') return null;
  const isAi = kind === 'ai';
  return (
    <span
      className={`shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase leading-none tracking-wide ${
        isAi ? 'bg-gold/20 text-gold' : 'bg-accent/20 text-accent-bright'
      }`}
      title={isAi ? 'Live AI player' : 'Algorithmic bot'}
    >
      {isAi ? 'AI' : 'Bot'}
    </span>
  );
}

function PlayerCard({
  player,
  isTurn,
  isActiveSeat,
  state,
}: {
  player: Player;
  isTurn: boolean;
  isActiveSeat: boolean;
  state: GameState;
}) {
  return (
    <div
      className={`glass relative overflow-hidden rounded-2xl p-3 transition ${
        player.bankrupt ? 'opacity-40 saturate-0' : ''
      } ${isActiveSeat ? 'ring-1 ring-accent/70 shadow-glow-sm' : ''}`}
    >
      {/* left color spine */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: player.color }} />

      <div className="flex items-center gap-2.5 pl-1">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-table-950 ring-2 ring-black/30"
          style={{ backgroundColor: player.color }}
        >
          {monogram(player.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-ink">{player.name}</span>
            <KindBadge player={player} />
            {player.jail.inJail && <span className="text-[11px]" title="In prison">🔒</span>}
          </div>
          <div className="tabular text-sm font-bold text-gold">{money(player.cash)}</div>
        </div>

        {isTurn && !player.bankrupt && (
          <span className="shrink-0 rounded-md bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-glow-sm">
            Turn
          </span>
        )}
        {player.bankrupt && (
          <span className="shrink-0 rounded-md bg-danger/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger">
            Bust
          </span>
        )}
      </div>

      {player.properties.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-[3px] pl-1">
          {player.properties.map((pos) => (
            <div
              key={pos}
              className="h-2 w-3.5 rounded-[2px]"
              style={{
                backgroundColor: swatchColor(state, pos),
                opacity: state.mortgaged[pos] ? 0.3 : 1,
              }}
              title={state.board[pos]?.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlayerPanel({ state, activeSeatId }: Props) {
  const current = state.players[state.currentPlayerIndex];
  return (
    <div className="flex max-h-[40vh] shrink-0 flex-col gap-2 overflow-y-auto pr-1">
      {state.players.map((player) => (
        <PlayerCard
          key={player.id}
          player={player}
          isTurn={current?.id === player.id}
          isActiveSeat={player.id === activeSeatId}
          state={state}
        />
      ))}
    </div>
  );
}
