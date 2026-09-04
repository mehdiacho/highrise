import type { Action, TradeAssets } from '@richup/shared/types';
import { useGame } from './store.js';

/**
 * Drop-in replacements for the socket action senders, backed by the in-browser
 * engine. Every action is attributed to the live seat (current player, or the
 * active auction bidder), which is what makes pass-and-play work on one screen.
 */

function activeSeat(): string | null {
  return useGame.getState().activeSeatId;
}

function send(action: Action): void {
  useGame.getState().dispatch(action);
}

export function roll(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'roll', playerId, dice: [1, 1] }); // dice injected in dispatch
}

export function buy(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'buy', playerId });
}

export function decline(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'decline', playerId });
}

export function bid(increment: 2 | 10 | 100): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'bid', playerId, increment });
}

export function passAuction(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'pass_auction', playerId });
}

export function endTurn(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'end_turn', playerId });
}

export function mortgage(tilePosition: number): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'mortgage', playerId, tilePosition });
}

export function unmortgage(tilePosition: number): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'unmortgage', playerId, tilePosition });
}

export function buildHouse(tilePosition: number): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'build', playerId, tilePosition });
}

export function sellBuilding(tilePosition: number): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'sell_building', playerId, tilePosition });
}

export function tradeCreate(toId: string, offer: TradeAssets, demand: TradeAssets): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'trade_create', playerId, toId, offer, demand });
}

/** The responder is the trade's target, not the seat currently acting. */
export function respondTrade(tradeId: string, action: 'accept' | 'reject', responderId: string): void {
  send({ type: 'trade_respond', playerId: responderId, tradeId, action });
}

export function payJailFine(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'pay_jail_fine', playerId });
}

export function useJailCard(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'use_jail_card', playerId });
}

export function declareBankrupt(): void {
  const playerId = activeSeat();
  if (playerId) send({ type: 'declare_bankrupt', playerId });
}
