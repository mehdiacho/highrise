import type { GameState, GameEvent } from '@richup/shared/types';

export function formatEvent(event: GameEvent, state: GameState): string {
  const name = (id: string) => state.players.find((p) => p.id === id)?.name ?? id;
  const tile = (pos: number) => state.board[pos]?.name ?? `Tile ${pos}`;

  switch (event.type) {
    case 'rolled':
      return `${name(event.playerId)} rolled ${event.dice[0]}+${event.dice[1]}=${event.dice[0] + event.dice[1]}${event.doubles ? ' (doubles!)' : ''}`;
    case 'moved':
      return `${name(event.playerId)} moved to ${tile(event.to)}`;
    case 'passed_start':
      return `${name(event.playerId)} passed Start (+$${event.amount})`;
    case 'bought':
      return `${name(event.playerId)} bought ${tile(event.tilePosition)} for $${event.price}`;
    case 'rent_paid':
      return `${name(event.payerId)} paid $${event.amount} rent to ${name(event.ownerId)} (${tile(event.tilePosition)})`;
    case 'tax_paid':
      return `${name(event.playerId)} paid $${event.amount} tax at ${tile(event.tilePosition)}`;
    case 'card_drawn':
      return `${name(event.playerId)} drew a ${event.deck === 'surprise' ? 'Surprise' : 'Treasure'} card`;
    case 'auction_started':
      return `Auction started for ${tile(event.tilePosition)}`;
    case 'auction_bid':
      return `${name(event.playerId)} bid $${event.amount}`;
    case 'auction_won':
      return `${name(event.playerId)} won ${tile(event.tilePosition)} for $${event.amount}`;
    case 'auction_no_winner':
      return `No one bought ${tile(event.tilePosition)} — property stays unowned`;
    case 'built':
      return `${name(event.playerId)} built on ${tile(event.tilePosition)} (${event.buildings} building${event.buildings > 1 ? 's' : ''})`;
    case 'sold_building':
      return `${name(event.playerId)} sold a building on ${tile(event.tilePosition)}`;
    case 'mortgaged':
      return `${name(event.playerId)} mortgaged ${tile(event.tilePosition)} (+$${event.received})`;
    case 'unmortgaged':
      return `${name(event.playerId)} unmortgaged ${tile(event.tilePosition)} (-$${event.paid})`;
    case 'sent_to_prison':
      return `${name(event.playerId)} was sent to Prison (${event.reason.replace('_', ' ')})`;
    case 'released_from_prison':
      return `${name(event.playerId)} was released from Prison (${event.reason})`;
    case 'trade_proposed':
      return `${name(event.fromId)} proposed a trade to ${name(event.toId)}`;
    case 'trade_accepted':
      return `Trade accepted!`;
    case 'trade_rejected':
      return `Trade rejected`;
    case 'bankrupt':
      return `${name(event.playerId)} went bankrupt!`;
    case 'game_over':
      return `🏆 ${name(event.winnerId)} wins the game!`;
    default:
      return 'Unknown event';
  }
}

interface Props {
  state: GameState;
}

export default function EventLog({ state }: Props) {
  const recentEvents = [...state.log].reverse().slice(0, 30);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <h3 className="px-1 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Game Log</h3>
      <div className="glass min-h-0 flex-1 space-y-0.5 overflow-y-auto rounded-2xl p-2.5">
        {recentEvents.length === 0 ? (
          <p className="py-3 text-center text-xs text-ink-faint">Nothing yet — roll to begin</p>
        ) : (
          recentEvents.map((event, i) => (
            <div
              key={i}
              className={`rounded-lg px-2 py-1 text-xs leading-relaxed ${
                i === 0 ? 'bg-white/[0.06] font-medium text-ink animate-rise' : 'text-ink-muted'
              }`}
            >
              {formatEvent(event, state)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
