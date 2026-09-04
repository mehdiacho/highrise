# Roadmap & Product Vision

Living document. Captures the direction beyond the current hot-seat UI cut. The
game-rules source of truth stays `docs/richup-spec.md`; this file is product
scope and sequencing. When a line here becomes real, move the detail into the
spec or the code and leave a dated note in `CLAUDE.md`'s decision log.

Status legend: **now** (active UI phase) · **next** (immediately after) ·
**later** (needs backend / accounts / payments) · **vision** (directional).

---

## 1. Players & seat kinds

- **now** — Support up to **12 players** per game.
- Three seat kinds:
  - **Human** — a person taking a turn on the shared screen (hot-seat), or a
    networked client once multiplayer lands.
  - **Bot** — deterministic, pre-written algorithm (the existing greedy policy
    in `packages/shared/src/bot.ts`). Cheap, instant, no model call.
  - **AI** — a live model that receives the **full board context** each decision
    and reasons about buying, trading, building, and movement strategically.
    Runs in real time server-side; distinct from Bot.
- Data model: `Player.kind: 'human' | 'bot' | 'ai'` (added, optional for
  back-compat with `isBot`). `isBot` stays true for both bot and ai so existing
  turn-skipping / auto-play code keeps working; `kind` carries the distinction
  the UI and the AI driver need.
- **next** — an **AI turn driver**: on an ai seat's turn, assemble a board-state
  prompt, call the model, map the response back to engine `Action`s. Must go
  through the same pure `reduce()` so games stay replayable.

## 2. Board & cell design

- **now** — Board **scaled larger**; its top and bottom align with the screen's
  viewable area (fit-to-height, capped by width).
- **now** — Group **color bands touch the inner edge** of the ring (the edge
  facing the board's center), not always the top of the cell.
- **now** — **Property text orientation** is a **settings toggle**:
  - *Uniform* — every label reads left-to-right (accessible, no neck-craning).
  - *Inward* — labels rotate to face the board center (classic tabletop look).
- **vision** — a **3D board** with **3D avatars**; the 2D board stays the
  default / fallback view.

## 3. Core interactive components (design-pass inventory)

> **Superseded by [`design-brief.md`](design-brief.md).** That document is the real design
> request: it covers every surface (not just these ten), treats the current build as a
> placeholder rather than a baseline, explicitly asks for alternative layouts, and includes
> the 3D board and the non-game pages. The table below is kept as the seed it grew from.

For a dedicated design pass (e.g. Cloud Design). Each is a discrete surface with
its own states.

| Component | Role | Key states |
|---|---|---|
| **Cell** | One board tile | unowned · owned (owner spine) · mortgaged · has buildings · players-present · hover/selected · corner vs special vs city |
| **Player list** | Roster with cash, holdings, turn marker | active turn · bankrupt · bot/ai badge · low-cash warning |
| **Game log** | Beneath the centerpiece; **fades in/out** to surface the latest action/roll; readable from the bottom property row | idle (faded) · new-event (fade in) · rolling |
| **Roll dice button** | Primary turn action | enabled · disabled (not your turn / wrong phase) · rolling |
| **Dice** | The 2d6 result | idle · tumbling · settled · doubles highlight |
| **Centerpiece** | Board center console: current player + their rolls | pre-roll · rolled · auction · game-over |
| Property detail modal | Inspect a tile: rent ladder, build, mortgage | own vs others' · buildable · mortgaged |
| Trade builder | Compose an offer | drafting · pending · **confirm step** (anti-misclick) |
| Auction | Live bidding on a declined property | your bid · waiting · won/no-winner |
| Setup / lobby | Choose players, kinds, colors, settings | 2–12 seats · start |

## 4. Multiplayer & accounts — **next**

- Online multiplayer (re-attach the kept `net/socket.ts` + `apps/server` onto
  these same view components; make `local/actions.ts` transport-aware).
- Settings surface (rules toggles, text orientation, map choice).
- User signup; **persist game history & metrics** on registration.

## 5. Economy & monetization — **later**

- Scoring system + leaderboards.
- Digital **credit** system to buy avatars (esp. for the 3D board).
- Avatar / item **trading** with a **confirmation step** (prevent accidental
  trades).
- **Market with scarcity** — items surface at different times, some rare;
  stock-market-style valuation.
- Payment system to buy credits / points.
- **Dynamic in-game currency** whose value tracks user purchasing power
  (crypto-like) **without** touching real currency or getting aggressive enough
  to defeat its purpose. Double-tiered currency is an option on the table.

## 6. Marketplace & content — **later**

- Buy additional **map boards**; unlock **game modes**.

## 7. User-defined rule system — **later / vision**

A system for users to **programmatically define game rules**.

- A **rule syntax** + a UI to write, define, and apply custom rules.
- Requires first enumerating the **"business rules" the engine can enforce**
  (the set of hooks a rule can attach to — e.g. rent calc, landing, pass-start,
  turn order).
- Example — **business alliances**: allied players pay **no / reduced rent**
  (e.g. 50% or 25%) on each other's properties, enforced by the engine.
- An online **index / wiki** to publish, share, and interact with rule sets.
- **De-dupe** on publish → "bragging rights" to the first publisher.
- **Upvote / ranking**; one-click apply a published rule set to your game.

## 8. Hosting & naming — **priority: online testing**

- Host on **Firebase**.
- Domain: `highrise.greenforrest.app` — note **two R's** in `greenforrest`
  (confirmed 2026-09-04; the zone Resend is verified against). The game name is
  **Highrise**, chosen 2026-09-04.

---

### Immediate build order (this UI phase)

1. 12 players + seat kinds (Human / Bot / AI) in setup ✅ in progress
2. Board fit-to-viewport scaling
3. Inner-edge color bands
4. Text-orientation settings toggle
5. Fading action ticker under the centerpiece
6. Modal restyle pass (property / trade / bankrupt) to the glass treatment

Deferred until "the UI is down": everything in §4–§8.
