# Richup.io — Clone-able Spec

A reconstruction of the public surface and inferred internals of [richup.io](https://richup.io), assembled from a third-party Selenium bot's DOM locators, Richup's own product blog, descriptions on distribution sites, and standard Monopoly-derivative rules.

> **What I could *not* see from the outside:** the minified/hashed JS bundle, live WebSocket frames, and the exact property/card data. The "How to fill in the gaps" section at the end is a recipe to pull those in a single DevTools session.

---

## 1. Architecture (inferred + confirmed)

| Layer | Stack |
|---|---|
| Frontend | React SPA, single-page app (`/room/:code` is client-routed; `/` returns the same shell HTML) |
| Styling | **CSS Modules** — class names are 8-char hashes like `zrAsGo65`, `_YZ7dkIA`, `LJ72TaNX` (confirmed via DOM locators) |
| Bundler | Webpack-style (consistent with CSS Modules hash format) |
| Realtime | Almost certainly Socket.io or raw WebSocket — turn-based, ≤8 players, low-frequency state broadcast |
| Auth | Discord OAuth (login flow confirmed); guest play also supported |
| Routing | 5-char base-36-ish room codes (e.g. `/room/6m9yd`) — `noindex` meta tag on room pages |
| Blog | Separate **Ghost** install at `blog.richup.io` |
| Analytics | Google Tag Manager (`GTM-KD6CN2M`) |
| Monetization backend | PayPal for "Richup Coins" purchases |
| Distribution | Embedded on partner sites (GoGy, Kevin.games, SolitaireParadise) — implies an iframe-friendly mode |

---

## 2. Domain model

### 2.1 Board

40 tiles arranged in a square loop, traversed clockwise:

| Count | Type | Names used |
|---|---|---|
| 4 | Corners | **Start**, **Prison**, **Vacation**, **Go to Prison** |
| 22 | City properties | 8 color groups, distribution likely `2/3/3/3/3/3/3/2` |
| 4 | Airports | "Airport" (≡ Railroad) |
| 2 | Utilities | (≡ Electric Company / Water Works) |
| 2 | Tax | Income Tax, Luxury Tax |
| 6 | Card draws | 3× **Surprise** (≡ Chance) + 3× **Treasure** (≡ Community Chest) |

> **Multiple maps.** The in-app store sells alternative board maps with different properties and different Surprise/Treasure decks. The default map theme is international cities (USA, UK, Italy, France, Germany, China, etc.). When cloning, model the board as data, not as a hard-coded layout.

### 2.2 Types

```ts
type TileType =
  | 'start' | 'prison' | 'vacation' | 'go_to_prison'
  | 'city' | 'airport' | 'utility'
  | 'income_tax' | 'luxury_tax'
  | 'surprise' | 'treasure';

type Tile = {
  position: number;          // 0..39
  type: TileType;
  name?: string;
  group?: string;            // color group id, cities only
  price?: number;
  mortgageValue?: number;    // = floor(price / 2)
  unmortgageCost?: number;   // = mortgageValue * 1.1, then rounded
  buildCost?: number;        // cost per house, cities only
  rents?: {
    base: number;
    fullSet: number;         // unimproved, owner holds full group → typically 2 × base
    house1: number;
    house2: number;
    house3: number;
    house4: number;
    hotel: number;
  };
  taxAmount?: number;        // tax tiles only
};

type Player = {
  id: string;
  name: string;
  discordId?: string;
  avatar: string;            // skin id from store / default
  color: string;
  isBot: boolean;
  isHost: boolean;

  position: number;          // 0..39
  cash: number;
  properties: number[];      // tile positions

  jail: {
    inJail: boolean;
    turnsServed: number;     // 0..3
    getOutCards: number;
  };
  bankrupt: boolean;
  disconnected: boolean;
};

type Auction = {
  tilePosition: number;
  currentBid: number;
  currentBidderId: string | null;
  participantIds: string[];  // players still in the auction
  endsAt: number;            // server timestamp
};

type TradeOffer = {
  id: string;
  fromId: string;
  toId: string;
  offer:  { cash: number; properties: number[]; jailCards: number };
  demand: { cash: number; properties: number[]; jailCards: number };
  status: 'pending' | 'accepted' | 'rejected' | 'countered';
};

type Card = {
  id: string;
  text: string;
  effect: CardEffect;
};

type CardEffect =
  | { type: 'pay_bank'; amount: number }
  | { type: 'collect_bank'; amount: number }
  | { type: 'pay_each_player'; amount: number }
  | { type: 'collect_each_player'; amount: number }
  | { type: 'pay_per_building'; perHouse: number; perHotel: number }
  | { type: 'move_to'; tilePosition: number; collectStart: boolean }
  | { type: 'move_relative'; steps: number }
  | { type: 'move_to_nearest'; tileType: 'airport' | 'utility'; rentMultiplier?: number }
  | { type: 'go_to_prison' }
  | { type: 'get_out_of_prison_card' };

type GameState = {
  roomCode: string;
  status: 'lobby' | 'in_progress' | 'finished';
  settings: GameSettings;

  players: Player[];
  currentPlayerIndex: number;
  turnPhase: 'pre_roll' | 'rolled' | 'post_action' | 'auction' | 'trade';

  dice: [number, number] | null;
  doublesStreak: number;     // 0..2 (3rd → jail before move resolves)

  board: Tile[];             // 40 tiles, static per map
  ownership: Record<number, string | null>;  // tilePos → playerId
  buildings: Record<number, number>;          // tilePos → 0..5 (5 = hotel)
  mortgaged: Record<number, boolean>;

  surpriseDeck: Card[];
  treasureDeck: Card[];
  surpriseDiscard: Card[];
  treasureDiscard: Card[];

  auction: Auction | null;
  trades: TradeOffer[];
  log: GameEvent[];
};

type GameSettings = {
  startingCash: number;          // 1500
  passStartBonus: number;        // likely 200
  maxPlayers: number;            // 2..8 (8 is a paid room feature)
  turnTimeoutSeconds: number;    // auto-kick on idle
  mapId: string;                 // default | premium maps from the store
  allowAuction: boolean;
  doublesToJail: number;         // 3
  maxJailTurns: number;          // 3
};
```

---

## 3. Action set

Extracted from the public Selenium bot's [DOM locators](https://github.com/shadazls/Monopoly-Bot-Richup.io/blob/main/locators.py) plus the standard Monopoly action surface. Client → server message names are guesses, but the action surface is concrete:

| Action | UI element | Notes |
|---|---|---|
| Roll dice | `ROLL_DICES_BUTTON` | Available in `pre_roll` |
| Roll again | `ROLL_DICES_AGAIN_BUTTON` | Appears after a double |
| Buy property | `BUY_PROPERTY_BUTTON` | On landing on unowned property |
| End turn | `END_TURN_BUTTON` | After all actions resolved |
| Send to auction | `AUCTION_BUTTON` | Decline to buy → auction starts |
| Bid +$2 / +$10 / +$100 | `AUCTION_BID_2/10/100_BUTTON` | Discrete bid increments, not free-form |
| Create trade | `CREATE_TRADE_BUTTON` | Multi-step builder, picks target player first |
| Pick trade target | `LIST_PLAYER_TRADE_DIV` → `SELECT_PLAYER_TRADE_BUTTON` | |
| Declare bankrupt | `BANKRUPT_BUTTON` → `BANKRUPT_CONFIRM_BUTTON` | Two-step confirmation |
| Votekick | `VOTEKICK_BUTTON` | Community moderation |

Implied but not in locators: `mortgage` / `unmortgage`, `build_house` / `sell_house`, `pay_jail_fine` / `use_jail_card`, `accept_trade` / `reject_trade` / `counter_trade`, `draw_card` (server-driven).

### Probable wire format (Socket.io)

Server → client, full state on join + deltas thereafter:
```jsonc
// initial
{ "event": "state",   "state": { /* full GameState */ } }
// updates
{ "event": "patch",   "ops": [{ "path": "/players/0/cash", "value": 1300 }] }
{ "event": "log",     "entry": { "actor": "p_3", "type": "rent_paid", "to": "p_1", "amount": 220 } }
// prompts
{ "event": "prompt",  "kind": "buy_or_auction", "tilePos": 19, "deadline": 1731423000 }
```

Client → server:
```jsonc
{ "type": "roll" }
{ "type": "buy",       "tilePos": 19 }
{ "type": "decline" }
{ "type": "bid",       "amount": 2 }
{ "type": "mortgage",  "tilePos": 21 }
{ "type": "build",     "tilePos": 21 }
{ "type": "trade_create", "to": "p_2", "offer": { ... }, "demand": { ... } }
{ "type": "trade_respond", "tradeId": "...", "action": "accept" }
{ "type": "bankrupt" }
{ "type": "end_turn" }
```

Confirm the exact event names, framing, and whether they use patches or full-state in your DevTools Network → WS panel.

---

## 4. Rules

### Setup
- 2–8 players (8 is the paid "larger rooms" feature; default cap is 4)
- Everyone starts at **Start** with **$1500**
- Each player picks an appearance (cosmetic only)

### Turn loop
1. Roll 2d6
2. Doubles → move and roll again
3. **Three consecutive doubles → immediately to Prison** (third move doesn't resolve)
4. Move clockwise by total of the dice
5. Pass Start → collect **$200** (likely — confirm)
6. Resolve the landed tile (see below)
7. Optional post-action: mortgage/unmortgage, build/sell, propose trade
8. End turn (or auto-end if no doubles)

### Tile resolution

| Tile | Effect |
|---|---|
| **City** unowned | Buy at face value, **or** decline → auction (any player can bid, no minimum) |
| **City** owned, no buildings | Pay base rent. **Doubled** if owner holds the full group |
| **City** owned, with buildings | Pay rent from the matching tier in the rent table |
| **City** owned, mortgaged | No rent |
| **Airport** owned | Rent scales with number of airports the owner holds (1/2/3/4 — standard Monopoly progression unless their data says otherwise) |
| **Utility** owned | Rent = dice total × multiplier (standard: 4× with one utility, 10× with both) |
| **Surprise** / **Treasure** | Draw top card, execute, return to bottom |
| **Income Tax** / **Luxury Tax** | Pay fixed amount to bank |
| **Start** | Land bonus is the same as passing (no double bonus in Richup) |
| **Vacation** | Nothing — no Free-Parking jackpot |
| **Prison** (just visiting) | Nothing |
| **Go to Prison** | Teleport to Prison, no Start collection |

### Prison
- Stay **up to 3 turns**
- Each in-prison turn, try one of: pay fine, roll doubles, use a get-out-of-prison card
- After 3 turns: must pay fine and move with whatever you rolled
- **Can still collect rent while in prison**

### Building
- Require: full color group owned, **none of them mortgaged**
- Build **evenly** — no more than 1 building difference between properties in the group
- Order: 1 house → 2 → 3 → 4 → hotel (replaces 4 houses)
- Selling: reverse — sell evenly, at half buildCost
- Some Monopoly variants cap total houses/hotels per board; Richup likely doesn't enforce this

### Mortgage
- Receive **floor(price / 2)** from the bank
- Unmortgage costs **mortgageValue × 1.1** (10% interest, rounded)
- Must sell all buildings on the property's group before mortgaging
- Mortgaged properties pay no rent

### Auction
- Triggered when a player declines an unowned property
- Discrete bid buttons: **+$2 / +$10 / +$100**
- Highest bidder wins, pays bank, receives property
- No minimum bid → property can sell well below face value
- Server-side deadline drops auto-skipped players

### Trading
- Two players, multi-asset: cash, properties, jail cards both ways
- Recipient accepts, rejects, or counters
- A counter creates a new pending offer in the other direction
- Properties in a mortgaged state are tradeable but transfer with their mortgage

### Bankruptcy
- Triggered when a player owes more than (cash + sellable buildings + mortgageable property value)
- All properties transfer to the **creditor** (player they owed)
- If the creditor is the bank → properties are auctioned among remaining players
- Buildings on transferred properties are sold to the bank at half price first
- Player is removed; remaining players continue

### Win conditions
- Last solvent player wins
- Optional: vote to end early; richest net-worth player wins

---

## 5. Cards

Two decks: **Surprise** and **Treasure**. Card effects (inferred from standard Monopoly + Richup's UI):

- Direct cash: pay/collect from bank
- Per-player cash: pay/collect from each player (e.g. birthday)
- Per-building cash: pay $X/house, $Y/hotel for repairs
- Movement: move to named tile (Start, Prison, named property), advance N spaces
- Move to nearest airport/utility with a special rent rule (e.g. 2× rent if landing on owned)
- Go directly to Prison (do not collect on passing Start)
- "Get out of prison free" — kept until used or sold/traded

When cloning, model cards as `{ id, text, effect: CardEffect }` with a discriminated-union effect — that way you can edit decks without code changes, and a new map is just a different deck file.

---

## 6. Bots

Richup advertises bot opponents in private games. The server runs them internally; from the protocol's perspective, a bot is just a `Player` with `isBot: true`. Their decision policy is the only non-trivial piece you'll need to design yourself — start with greedy buy + auction-up-to-face-value + build-when-group-completed, and iterate.

---

## 7. Assets

| Asset | Source |
|---|---|
| Profile pictures | MIT-licensed pack |
| Sound effects | [notificationsounds.com](https://notificationsounds.com/) |
| Board art / sprites | `/resources/images/{8charHash}.png` |
| OG image | `/og_image.png` |
| Premium maps & skins | Sold via the in-app store |

For your clone, you can't lift their art directly (copyright on the *expression* still applies even though the *rules* don't — see their `/info` page where they quote the US Copyright Office on this). Notificationsounds.com is fair game with their CC license; everything else, commission or generate.

---

## 8. Monetization

- Free base game with ads
- **Richup Coins** — 1 coin per win against real players, also purchasable via PayPal
- Store sells: profile pictures, player tokens (skins), alternative board maps, ad removal, 7–8 player room unlock

---

## 9. How to fill in the gaps yourself

This is the 20-minute DevTools session that gets you the data this spec is missing.

**Open DevTools before joining a room.** Network tab, "WS" filter, "Preserve log" on.

1. **Get the initial game state.** Join a room. In WS, find the socket.io connection (path is usually `/socket.io/?EIO=4&transport=websocket`). The first big inbound frame after the handshake is usually the full state. Right-click → Copy → look for an array of 40 tile objects with names, prices, and rent tables. That's your authoritative default map.

2. **Find static configs in source.** Sources panel → Ctrl+Shift+F to search all files. Search for any name visible on the board (e.g. a city name from your current room, or `"prison"`, `"vacation"`). Property data is usually inlined in a JSON chunk or in a `boards.<hash>.js`. Use the `{}` pretty-print button before reading.

3. **Surprise/Treasure decks.** Same global search. Try `"Bank pays"`, `"Go to"`, `"Collect"`, `"birthday"`. Cards live as a flat array. Capture both decks.

4. **Card effect schema.** Trigger a few different cards in a real game and watch the WS frames. The card object on the wire will include the structured `effect` payload. Catalogue 5–10 distinct effects and the schema becomes obvious.

5. **Action protocol.** Take each action from the Action Set table above and record the outbound WS frame. That's your client → server message catalog.

6. **Asset library.** Network → Img filter → `/resources/images/`. The 8-char hashes are your asset IDs.

7. **(Optional) debundle.** If you want the full client logic, tools like `wakaru` or `webcrack` can recover a readable React tree from a minified Webpack bundle. Source maps are almost certainly off in prod (`.js.map` 404), so you're doing it from the minified files. CSS Modules class names won't recover (they're compile-time), but component structure and game logic will.

---

## 10. Suggested stack for the clone

Given your existing tooling (Vite + React + Tailwind):

| Concern | Choice |
|---|---|
| Frontend | React + Vite (you've already got this) + Tailwind |
| State (client) | Zustand or Redux Toolkit — full server-authoritative state with client mirror |
| Realtime | Socket.io on a Node + Fastify or NestJS backend |
| Server state | Redis for room state (sticky to a single process initially; add adapter when you scale) |
| Persistence | Postgres for accounts, wins, store purchases |
| Auth | Skip OAuth at first — anonymous players with 5-char room codes (richup did this originally; Discord came later) |
| Hosting | Fly.io, Render, or Railway — anything with sticky sessions / socket.io adapter |
| Bot AI | Start with a hand-coded greedy policy; later, consider an MCTS or RL agent (matches the WarEra.io agent direction) |

The Discord OAuth is the easiest piece to defer — and the largest cosmetic-shop / coins economy is also deferrable since the **game itself works perfectly as a free room-code-only thing**, which is the version richup launched with in 2020.

---

## What this spec gives you

A faithful clone is ~3 weeks of focused work from this spec:
- Week 1: server state machine + REST room creation + Socket.io message handling
- Week 2: React client + board rendering + basic actions (roll/buy/end turn)
- Week 3: auctions + trading + bots + polish

The DevTools session in §9 plus this doc gives you everything you need to actually start. The gameplay rules are uncopyrightable; the *exact expression* (property names, card text, art) you should regenerate, not copy.
