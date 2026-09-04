import type { GameState } from '@richup/shared/types';
import { canBuild, canSellBuilding, canMortgage, canUnmortgage, mortgageValue, unmortgageCost } from '@richup/shared/engine/rules';
import { buildHouse, sellBuilding, mortgage, unmortgage } from '../local/actions.js';
import { GROUP_COLORS, money } from '../local/theme.js';

interface Props {
  tilePosition: number;
  state: GameState;
  myPlayerId: string | null;
  onClose: () => void;
}

export default function PropertyDetail({ tilePosition, state, myPlayerId, onClose }: Props) {
  const tile = state.board[tilePosition];
  if (!tile) return null;

  const ownerId = state.ownership[tilePosition] ?? null;
  const owner = ownerId ? state.players.find((p) => p.id === ownerId) : null;
  const buildings = state.buildings[tilePosition] ?? 0;
  const isMortgaged = state.mortgaged[tilePosition] ?? false;
  const isMyTurn = state.players[state.currentPlayerIndex]?.id === myPlayerId;
  const isPostAction = state.turnPhase === 'post_action';

  const iCanBuild = myPlayerId && isMyTurn && isPostAction && canBuild(state, myPlayerId, tilePosition);
  const iCanSell = myPlayerId && isMyTurn && isPostAction && canSellBuilding(state, myPlayerId, tilePosition);
  const iCanMortgage = myPlayerId && isMyTurn && isPostAction && canMortgage(state, myPlayerId, tilePosition);
  const iCanUnmortgage = myPlayerId && isMyTurn && isPostAction && canUnmortgage(state, myPlayerId, tilePosition);
  const hasActions = iCanBuild || iCanSell || iCanMortgage || iCanUnmortgage;

  const buildingLabels = ['0 houses', '1 house', '2 houses', '3 houses', '4 houses', 'Hotel'];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-table-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="glass w-80 space-y-4 overflow-hidden rounded-2xl p-5 shadow-panel animate-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {tile.group && (
              <div
                className="mb-2 h-2.5 w-14 rounded-full"
                style={{ backgroundColor: GROUP_COLORS[tile.group], boxShadow: `0 0 10px ${GROUP_COLORS[tile.group]}66` }}
              />
            )}
            <h2 className="font-display text-xl font-bold text-ink">{tile.name}</h2>
            <p className="text-sm text-ink-muted">
              {tile.type === 'city' && `${money(tile.price ?? 0)} · Build ${money(tile.buildCost ?? 0)}/house`}
              {tile.type === 'airport' && 'Airport'}
              {tile.type === 'utility' && 'Utility'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg px-1.5 text-lg leading-none text-ink-faint transition hover:bg-white/5 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Owner */}
        {owner ? (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full ring-1 ring-black/40" style={{ backgroundColor: owner.color }} />
            <span className="text-ink-muted">
              Owned by <span className="font-semibold text-ink">{owner.name}</span>
            </span>
            {isMortgaged && <span className="text-xs font-semibold text-danger">· mortgaged</span>}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">
            Unowned — face value <span className="font-semibold text-gold">{money(tile.price ?? 0)}</span>
          </p>
        )}

        {/* Rent table for cities */}
        {tile.type === 'city' && tile.rents && (
          <div className="space-y-1 rounded-xl border border-white/10 bg-table-950/40 p-3 text-xs">
            <div className="flex justify-between text-ink-muted">
              <span>Base rent</span>
              <span className="tabular text-ink">{money(tile.rents.base)}</span>
            </div>
            <div className="flex justify-between text-ink-muted">
              <span>Full set</span>
              <span className="tabular text-ink">{money(tile.rents.fullSet)}</span>
            </div>
            {(['house1', 'house2', 'house3', 'house4', 'hotel'] as const).map((k, i) => {
              const active = buildings === i + 1;
              return (
                <div
                  key={k}
                  className={`flex justify-between ${active ? 'font-bold text-gold' : 'text-ink-muted'}`}
                >
                  <span>{buildingLabels[i + 1]}</span>
                  <span className="tabular">{money(tile.rents![k])}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Buildings */}
        {tile.type === 'city' && (
          <div className="text-sm text-ink-muted">
            Buildings: <span className="font-bold text-ink">{buildingLabels[buildings] ?? buildings}</span>
          </div>
        )}

        {/* Actions */}
        {hasActions && (
          <div className="space-y-2 pt-1">
            {iCanBuild && tile.buildCost != null && (
              <button
                onClick={() => {
                  buildHouse(tilePosition);
                  onClose();
                }}
                className="w-full rounded-xl bg-cash py-2 text-sm font-bold text-table-950 transition hover:brightness-110"
              >
                Build House ({money(tile.buildCost)})
              </button>
            )}
            {iCanSell && tile.buildCost != null && (
              <button
                onClick={() => {
                  sellBuilding(tilePosition);
                  onClose();
                }}
                className="w-full rounded-xl border border-gold/40 bg-gold/10 py-2 text-sm font-semibold text-gold transition hover:bg-gold/20"
              >
                Sell Building (+{money(Math.floor(tile.buildCost / 2))})
              </button>
            )}
            {iCanMortgage && tile.price != null && (
              <button
                onClick={() => {
                  mortgage(tilePosition);
                  onClose();
                }}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2 text-sm font-semibold text-ink transition hover:bg-white/10"
              >
                Mortgage (+{money(mortgageValue(tile.price))})
              </button>
            )}
            {iCanUnmortgage && tile.price != null && (
              <button
                onClick={() => {
                  unmortgage(tilePosition);
                  onClose();
                }}
                className="w-full rounded-xl bg-accent py-2 text-sm font-bold text-white shadow-glow-sm transition hover:bg-accent-bright"
              >
                Unmortgage (−{money(unmortgageCost(mortgageValue(tile.price)))})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
