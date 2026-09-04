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

> **Multiple maps.** The in-app store sells alternative board maps. Model the board as data, not as a hard-coded layout.

### 2.2 Types

See `packages/shared/src/types.ts` for the authoritative TypeScript types.

---

## 3. Action set

| Action | Notes |
|---|---|
| Roll dice | Available in `pre_roll` |
| Roll again | Appears after a double |
| Buy property | On landing on unowned property |
| End turn | After all actions resolved |
| Send to auction | Decline to buy → auction starts |
| Bid +$2 / +$10 / +$100 | Discrete bid increments |
| Create trade | Multi-step builder |
| Declare bankrupt | Two-step confirmation |
| Votekick | Community moderation |

---

## 4. Rules

### Setup
- 2–8 players (8 is the paid "larger rooms" feature; default cap is 4)
- Everyone starts at **Start** with **$1500**

### Turn loop
1. Roll 2d6
2. Doubles → move and roll again
3. **Three consecutive doubles → immediately to Prison**
4. Move clockwise by total of the dice
5. Pass Start → collect **$200**
6. Resolve the landed tile
7. Optional post-action: mortgage/unmortgage, build/sell, propose trade
8. End turn

### Prison
- Stay up to 3 turns
- Each in-prison turn: pay fine, roll doubles, or use get-out-of-prison card
- After 3 turns: must pay fine and move
- **Can still collect rent while in prison**

### Building
- Require full color group owned, none mortgaged
- Build evenly — no more than 1 building difference between properties
- 1 house → 2 → 3 → 4 → hotel

### Mortgage
- Receive `floor(price / 2)` from the bank
- Unmortgage costs `mortgageValue × 1.1` (rounded)
- Must sell all buildings on group before mortgaging

### Auction
- Discrete bids: +$2 / +$10 / +$100
- No minimum bid
- Server-side deadline

### Bankruptcy
- All properties transfer to creditor (player they owed)
- If creditor is bank → properties auctioned among remaining players

### Win conditions
- Last solvent player wins

---

## 5. Cards

Two decks: **Surprise** and **Treasure**.

Effects: pay/collect bank, pay/collect each player, pay per building, move to tile, advance N spaces, go to prison, get out of prison free.

---

## 6. Suggested stack for the clone

| Concern | Choice |
|---|---|
| Frontend | React + Vite + Tailwind |
| State (client) | Zustand |
| Realtime | Socket.io on Node + Fastify |
| Server state | In-memory Map |
| Auth | Anonymous players with room codes |
