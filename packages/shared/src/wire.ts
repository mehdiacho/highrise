import { z } from 'zod';

// ─── Client → Server ─────────────────────────────────────────────────────────

export const RollMsg = z.object({ type: z.literal('roll') });
export const BuyMsg = z.object({ type: z.literal('buy') });
export const DeclineMsg = z.object({ type: z.literal('decline') });
export const BidMsg = z.object({ type: z.literal('bid'), increment: z.union([z.literal(2), z.literal(10), z.literal(100)]) });
export const PassAuctionMsg = z.object({ type: z.literal('pass_auction') });
export const EndTurnMsg = z.object({ type: z.literal('end_turn') });

export const MortgageMsg = z.object({ type: z.literal('mortgage'), tilePosition: z.number() });
export const UnmortgageMsg = z.object({ type: z.literal('unmortgage'), tilePosition: z.number() });
export const BuildMsg = z.object({ type: z.literal('build'), tilePosition: z.number() });
export const SellBuildingMsg = z.object({ type: z.literal('sell_building'), tilePosition: z.number() });

const TradeAssetsSchema = z.object({
  cash: z.number().nonnegative(),
  properties: z.array(z.number()),
  jailCards: z.number().nonnegative(),
});
export const TradeCreateMsg = z.object({
  type: z.literal('trade_create'),
  toId: z.string(),
  offer: TradeAssetsSchema,
  demand: TradeAssetsSchema,
});
export const TradeRespondMsg = z.object({
  type: z.literal('trade_respond'),
  tradeId: z.string(),
  action: z.enum(['accept', 'reject']),
});

export const PayJailFineMsg = z.object({ type: z.literal('pay_jail_fine') });
export const UseJailCardMsg = z.object({ type: z.literal('use_jail_card') });
export const DeclareBankruptMsg = z.object({ type: z.literal('declare_bankrupt') });

export const JoinRoomMsg = z.object({
  type: z.literal('join_room'),
  roomCode: z.string(),
  playerName: z.string().min(1).max(24),
  color: z.string(),
});

export const StartGameMsg = z.object({ type: z.literal('start_game') });
export const AddBotMsg = z.object({ type: z.literal('add_bot') });

export const ClientMsg = z.discriminatedUnion('type', [
  JoinRoomMsg,
  StartGameMsg,
  AddBotMsg,
  RollMsg,
  BuyMsg,
  DeclineMsg,
  BidMsg,
  PassAuctionMsg,
  EndTurnMsg,
  MortgageMsg,
  UnmortgageMsg,
  BuildMsg,
  SellBuildingMsg,
  TradeCreateMsg,
  TradeRespondMsg,
  PayJailFineMsg,
  UseJailCardMsg,
  DeclareBankruptMsg,
]);

export type ClientMsg = z.infer<typeof ClientMsg>;

// ─── Server → Client ─────────────────────────────────────────────────────────

export const JoinedMsg = z.object({
  event: z.literal('joined'),
  playerId: z.string(),
  roomCode: z.string(),
  /** True when the game was already in progress, so this client watches only. */
  spectator: z.boolean().optional(),
});

export const StateMsg = z.object({
  event: z.literal('state'),
  state: z.unknown(), // GameState — typed on client via cast
});

export const PatchMsg = z.object({
  event: z.literal('patch'),
  // Simple delta: list of { path, value } pairs
  patches: z.array(z.object({ path: z.string(), value: z.unknown() })),
});

export const LogMsg = z.object({
  event: z.literal('log'),
  entry: z.unknown(), // GameEvent
});

export const PromptMsg = z.object({
  event: z.literal('prompt'),
  kind: z.enum(['buy_or_auction', 'auction_turn', 'trade_offer']),
  data: z.unknown(),
});

export const ErrorMsg = z.object({
  event: z.literal('error'),
  code: z.string(),
  message: z.string(),
});

export const ServerMsg = z.discriminatedUnion('event', [
  JoinedMsg,
  StateMsg,
  PatchMsg,
  LogMsg,
  PromptMsg,
  ErrorMsg,
]);

export type ServerMsg = z.infer<typeof ServerMsg>;

// ─── REST ─────────────────────────────────────────────────────────────────────

export const CreateRoomBody = z.object({
  hostName: z.string().min(1).max(24),
  color: z.string().optional(),
  settings: z
    .object({
      maxPlayers: z.number().int().min(2).max(12).optional(),
      startingCash: z.number().int().positive().optional(),
      passStartBonus: z.number().int().nonnegative().optional(),
      turnTimeoutSeconds: z.number().int().positive().optional(),
    })
    .optional(),
});

export type CreateRoomBody = z.infer<typeof CreateRoomBody>;

export interface CreateRoomResponse {
  roomCode: string;
  hostId: string;
}

export interface RoomInfoResponse {
  roomCode: string;
  status: string;
  playerCount: number;
  maxPlayers: number;
}
