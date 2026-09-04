import type { GameState, Action, Player } from './types.js';
import { canBuild, ownsFullGroup, netWorth, groupTiles } from './engine/rules.js';

const CASH_BUFFER = 200;

function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex]!;
}

/**
 * Greedy bot policy. Returns the next action a bot should take given the
 * current game state and the bot's player ID.
 *
 * Called repeatedly by the server until the bot's turn ends.
 */
export function botAction(state: GameState, playerId: string): Action | null {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.bankrupt) return null;

  const cp = currentPlayer(state);
  const isMyTurn = cp.id === playerId;

  switch (state.turnPhase) {
    case 'pre_roll': {
      if (!isMyTurn) return null;
      // Get out of jail cheaply
      if (player.jail.inJail) {
        if (player.jail.getOutCards > 0) {
          return { type: 'use_jail_card', playerId };
        }
        if (player.cash >= 50) {
          return { type: 'pay_jail_fine', playerId };
        }
        // Roll and hope for doubles
      }
      return { type: 'roll', playerId, dice: [1, 1] }; // dice supplied by server IO
    }

    case 'rolled': {
      if (!isMyTurn) return null;
      if (state.pendingBuy === null) return null;

      const tilePos = state.pendingBuy;
      const tile = state.board[tilePos];
      if (!tile || !tile.price) return { type: 'decline', playerId };

      // Buy if we can afford it and keep a buffer
      if (player.cash >= tile.price + CASH_BUFFER) {
        return { type: 'buy', playerId };
      }
      return { type: 'decline', playerId };
    }

    case 'auction': {
      if (!state.auction) return null;
      if (!state.auction.participantIds.includes(playerId)) return null;

      const tilePos = state.auction.tilePosition;
      const tile = state.board[tilePos];
      if (!tile?.price) return { type: 'pass_auction', playerId };

      const maxWilling = tile.price; // bid up to face value
      const nextBid = state.auction.currentBid + 2;

      if (nextBid <= maxWilling && player.cash >= nextBid) {
        return { type: 'bid', playerId, increment: 2 };
      }
      return { type: 'pass_auction', playerId };
    }

    case 'post_action': {
      if (!isMyTurn) return null;

      // Try to build on completed color groups
      for (const pos of player.properties) {
        const tile = state.board[pos];
        if (tile?.type !== 'city' || !tile.group || !tile.buildCost) continue;
        if (!ownsFullGroup(state, playerId, tile.group)) continue;
        if (state.mortgaged[pos]) continue;

        const group = groupTiles(state, tile.group);
        const totalBuildCost = group.length * tile.buildCost;
        if (player.cash < totalBuildCost + CASH_BUFFER) continue;

        if (canBuild(state, playerId, pos)) {
          return { type: 'build', playerId, tilePosition: pos };
        }
      }

      return { type: 'end_turn', playerId };
    }

    case 'trade': {
      // Bot always rejects incoming trades for simplicity
      const pendingTrade = state.trades.find(
        (t) => t.toId === playerId && t.status === 'pending',
      );
      if (pendingTrade) {
        // Accept if our net worth improves
        const currentNw = netWorth(player, state);
        const gainCash = pendingTrade.demand.cash - pendingTrade.offer.cash;
        if (gainCash > 0 && pendingTrade.offer.properties.length === 0) {
          return { type: 'trade_respond', playerId, tradeId: pendingTrade.id, action: 'accept' };
        }
        return { type: 'trade_respond', playerId, tradeId: pendingTrade.id, action: 'reject' };
      }
      return null;
    }

    default:
      return null;
  }
}
