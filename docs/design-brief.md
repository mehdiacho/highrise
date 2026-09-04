# Highrise — Design Brief

> **Status:** open design request. Nothing in the current build is approved.
> **Companion docs:** [`richup-spec.md`](richup-spec.md) (game rules — authoritative),
> [`roadmap.md`](roadmap.md) (product scope & sequencing),
> [`backlog.md`](backlog.md) (what's built vs. what isn't).

---

## 0. How to use this document

This is a **request for design**, not a description of an existing design. Each numbered
surface below is a discrete brief: what it is, what it must communicate, the states it has
to survive, and the constraints it cannot break.

Work through it surface by surface. For each one you should expect to produce **at least
two distinct directions** before converging — see §2.

**Read §1 and §2 before designing anything.** They set the mandate, and they are the two
sections most likely to be skimmed and then violated.

---

## 1. The mandate: everything is a placeholder

The current build exists to prove the game rules work. **Its appearance was never designed.**
It is a dark theme assembled from Tailwind defaults to make the engine visible.

**Treat every pixel currently on screen as disposable.** Specifically, none of the following
are decisions and none should be inherited:

- The dark "premium" palette, the glass/blur panels, the accent colour, the gold highlights
- The typography (system stack, current weights and scale)
- The board's proportions, the cell dimensions, the colour-band placement
- The right-hand rail arrangement (action panel → player list → log)
- The centre console (wordmark + current player + dice, stacked)
- The modals, the toasts, the buttons, the badges, the tag pills
- The token design (coloured circle with a two-letter monogram)
- The iconography (currently emoji: 🏁 ✈ ⚡ ❓ 💎 🔒 🚔 🏖 💸)

**The single thing worth preserving is the general concept of a ring-shaped board with a
usable centre.** Even that is open to challenge — see §2.

If a proposal happens to land near something the build already does, that's fine. But it
must be arrived at, not inherited.

---

## 2. Explore layouts — do not assume the current one

**This is an explicit instruction, not permission.** The current arrangement — square board
scaled to viewport height, fixed 320px right rail, log at bottom-right — was chosen because
it was quick, not because it tested well.

**Design and evaluate genuinely different layouts.** Judge them on function and comfort, not
on resemblance to a physical Monopoly set. Questions worth answering with alternatives:

- Does the board need to be square? A **wider aspect** wastes less space on 16:9 screens.
  What does a rectangular or hexagonal ring cost in legibility?
- Must the rail be on one side? Consider **split rails** (roster left, actions right),
  a **bottom action dock**, or **contextual controls that appear near the active tile**.
- Should the log live in the centre at all? It currently competes with the dice for the
  same space. Consider an **edge-anchored feed**, a **collapsible drawer**, or **inline
  event surfacing on the affected tile**.
- With **up to 12 players**, the roster is the layout's hardest problem. A 12-row list eats
  the rail. Consider **avatar clusters**, **collapsed/expanded rows**, **a horizontal
  strip**, or **a ring of seats around the board mirroring turn order**.
- Is a fixed board size right, or should it **respond** — larger when few players, denser
  rail when many?
- Where does the **current player's own state** (cash, holdings, jail status, cards) live so
  it's glanceable without hunting the roster for your own row?

Deliver at least **three board-and-shell layout concepts** with an honest trade-off note on
each. We will pick, or hybridise.

---

## 3. Hard constraints

Design freely, but these come from the engine and the rules. Breaking them means the design
can't be built without changing the game.

| Constraint | Detail |
|---|---|
| **40 tiles, fixed order** | The ring is 40 positions. Position order is fixed by the map data. |
| **11 tile types** | 22 city · 4 airport · 2 utility · 3 surprise · 3 treasure · 1 each: start, prison, vacation, go-to-prison, income tax, luxury tax |
| **8 colour groups** | brown, light blue, pink, orange, red, yellow, green, dark blue. Groups must be **distinguishable without relying on hue alone** (see §12 accessibility). |
| **Up to 12 simultaneous players** | Every roster, token, avatar and turn-order surface must survive 12. Design at 2, 6 and 12. |
| **Three seat kinds** | Human · Bot (deterministic algorithm) · AI (live model). These must be **visually distinct at a glance** — it changes how you play against them. |
| **Buildings per property** | 0–4 houses, then 1 hotel. Must be readable **on the tile itself** at board scale. |
| **Server-authoritative** | The client never decides outcomes. Any "optimistic" motion must reconcile to server truth without a jarring correction. |
| **Naming** | Start (not Go) · Prison (not Jail) · Vacation (not Free Parking) · Surprise (not Chance) · Treasure (not Community Chest) · Airport (not Railroad) |
| **Originality — non-negotiable** | Do **not** reproduce Monopoly's or richup.io's board, property names, card text, colour placement, token shapes, or visual identity. Rules are uncopyrightable; expression is not. Everything must be original. |

---

## 4. Design system foundations

Needed before or alongside the surfaces, since everything else depends on them.

| Item | Request |
|---|---|
| **Brand identity** | Highrise wordmark and logo mark. Currently a text treatment; needs a real mark that works as favicon, app icon, loading state, and in-board centrepiece. |
| **Colour system** | Full palette with semantic roles (surface levels, text levels, positive/cash, negative/debt, warning, accent, focus ring). Must define **light and dark** or make an explicit, reasoned single-theme commitment. |
| **Property group colours** | The 8 group colours, tuned for board legibility against the chosen surface, and distinguishable by more than hue. |
| **Player token colours** | 12 distinct seat colours that stay distinguishable when adjacent, small, overlapping, and for colour-blind users. This is a genuinely hard constraint — 12 is a lot. |
| **Typography** | Type scale, families, weights. Needs a display face for identity and a face that stays legible at ~9px on tile labels. |
| **Spacing & radii** | Scale, and the rules for panel/card/tile elevation. |
| **Iconography** | A real icon set replacing the current emoji, covering: tile types, actions (roll, buy, build, mortgage, trade, auction), seat kinds, states (jail, bankrupt, mortgaged), currency. |
| **Motion** | Timing/easing tokens, and the vocabulary: token movement, dice, card draw, money change, panel entry, turn handoff. |
| **Sound-visual pairing** | 24 synthesized sounds already exist and fire on game events. Every animation should be considered **with** its sound; a visual that fights its cue is worse than either alone. |
| **Elevation/depth** | How layers separate. Relevant to whether the current glass/blur direction survives. |

---

## 5. The board — 2D

### 5.1 Board shell
Ring layout, corner treatment, centre area shape and size, how the board scales across
viewports, and what happens at very small and very large sizes. See §2 — this is where
alternatives matter most.

### 5.2 Tiles — one design per type

Every type needs its own resolved design. Named cities carry the most weight; they are 22 of
40 and hold the most data.

| Type | Must show | Notes |
|---|---|---|
| **City** (22) | Name, price, group colour, buildings, owner, mortgaged state | The dense one. Name + price + group band + up to 5 buildings + owner + token cluster, at ~64px. |
| **Airport** (4) | Name, price, owner, mortgaged | Rent scales with how many the owner holds — consider surfacing that. |
| **Utility** (2) | Name, price, owner, mortgaged | Rent is dice-multiplied, not fixed — a different mental model worth expressing. |
| **Surprise** (3) | Type identity | Should feel distinct from Treasure at a glance. |
| **Treasure** (3) | Type identity | |
| **Start** | Identity, pass-bonus affordance | Corner. |
| **Prison** | Two distinct zones: **visiting** vs **imprisoned** | Corner. Players occupy both; must be unambiguous which. |
| **Vacation** | Identity | Corner. |
| **Go to Prison** | Identity, sense of consequence | Corner. |
| **Income Tax / Luxury Tax** (2) | Amount | |

### 5.3 Tile states
Each city tile must resolve: **unowned · owned (by whom) · mortgaged · 1–4 houses · hotel ·
occupied by 1 token · occupied by many tokens · hover · selected · legal-target highlight ·
recently-acted (the tile something just happened on)**.

**Ownership is a known weak point.** In the current build a player buys a property and it is
not obvious they now own it. Ownership needs to be unmistakable at board scale — this is a
specific, named problem to solve, not a nice-to-have.

### 5.4 Colour bands
Where the group band sits, how it reads on the four different edges of the ring, and how it
behaves on corners. Current build puts it on the interior-facing edge; that's a placeholder.

### 5.5 Label orientation
There is a settings toggle between **uniform** (all labels read left-to-right) and **inward**
(labels rotate to face centre). Both need to be designed and to look deliberate — the inward
mode currently just rotates text.

### 5.6 Tokens
Player markers on the board. Must handle **up to 12**, co-location (several on one tile),
movement, and the "this is me" distinction. Currently coloured circles with monograms — a
placeholder. Consider how this relates to the eventual **3D avatars** (§9): ideally the 2D
token is the same identity in a flatter form.

### 5.7 Movement & animation
Tokens currently hop tile-to-tile (~130ms/tile) and slide directly for teleports. Needs a
designed treatment for: **stepwise movement, passing Start, teleport/card movement, going to
Prison, leaving Prison, and the co-location reshuffle** when a token joins an occupied tile.

---

## 6. In-game surfaces

| Surface | Purpose | States to resolve |
|---|---|---|
| **Centrepiece** | Board centre: whose turn, dice, identity | pre-roll · rolling · rolled · auction · game over |
| **Dice** | 2d6 result | idle · tumbling · settled · **doubles** · third-double-to-prison |
| **Action bar** | The player's available moves | your turn (by phase: pre-roll, post-roll, buy-decision, post-action) · not your turn · in auction · spectating · bankrupt |
| **Player roster** | All seats, cash, holdings | active turn · human/bot/AI · low cash · in prison · bankrupt · you · **at 2, 6 and 12 players** |
| **Own-player summary** | Your cash, properties, cards, jail status | Currently absent as a distinct surface — you hunt for your own row. |
| **Event log / ticker** | What just happened | idle · new event · burst of several events · full history |
| **Property detail** | Inspect a tile | your property · someone else's · unowned · buildable · mortgaged · rent ladder display |
| **Trade builder** | Compose an offer | drafting · selecting assets from both sides · **explicit confirm step** · pending · accepted · rejected |
| **Auction** | Bidding on a declined property | your turn to bid · waiting on others · outbid · won · no winner |
| **Bankruptcy** | Declare / resolve | confirm · to bank (properties auctioned) · to creditor (properties transfer) |
| **Toasts / errors** | Illegal action feedback | Rule violations arrive as coded errors and must read as *why*, not *no*. |
| **Turn handoff** | Signalling the turn changed | Especially important in hot-seat, where a human must physically hand over. |
| **Game over** | Winner, final standings | Currently a trophy emoji and a button. Needs real closure — and it's the moment players screenshot and share. |
| **Spectator mode** | Watching a game in progress | Read-only board, no controls, clear "you are watching" framing. |

---

## 7. Setup, lobby & entry flows

| Screen | Purpose | Notes |
|---|---|---|
| **Home / mode select** | Pass & Play vs Online | First impression. Currently a toggle over a card. |
| **Pass & Play setup** | Name, colour, seat kind for 2–12 seats | The 12-seat case is the design problem — 12 rows of name+colour+kind is a lot of form. |
| **Online: create room** | Identity + create | |
| **Online: join room** | Room code entry | Includes the "game already started → you'll spectate" path. |
| **Waiting room / lobby** | Room code, player list, host controls | Host sees start/add-bot; others wait. Needs to make waiting feel intentional. |
| **Reconnect / rejoin** | Returning to a game in progress | Currently unhandled visually. |
| **Settings** | Rules toggles, label orientation, sound, map choice | Currently two controls in the header; needs a real home. |

---

## 8. Non-game pages

These do not exist yet in any form. All are greenfield.

| Page | Purpose |
|---|---|
| **Landing / marketing site** | What Highrise is, for someone who's never played. The public face at `highrise.greenforrest.app`. |
| **Sign up / sign in** | Account creation; currently no accounts exist. |
| **Player profile** | Identity, avatar, stats, owned items. |
| **Game history** | Past games, results, replays. |
| **Stats & metrics** | Per-player performance over time. |
| **Leaderboards** | Ranking and scoring. |
| **Marketplace — maps** | Browse and acquire additional board maps. |
| **Marketplace — game modes** | Browse and unlock rule variants. |
| **Avatar / item store** | Cosmetics, especially for the 3D board. |
| **Wallet / credits** | Balance, purchase history, top-up. |
| **Payments / checkout** | Buying credits. |
| **Item trading** | Player-to-player trades with an explicit **confirmation step** to prevent accidents. |
| **Market with scarcity** | Items appearing over time, some rare, with stock-market-style valuation. Needs a way to show **price movement** and **scarcity** honestly. |
| **Rule builder** | UI for authoring custom rules (see roadmap §7). A rule-authoring interface is a substantial design problem in its own right. |
| **Rule wiki / index** | Browse, publish, upvote, rank and one-click apply community rule sets. |
| **Rule set detail** | What a rule set does, who made it, adoption. |

> **Note on the economy pages.** Currency, scarcity and trading surfaces carry real
> persuasive weight. Design them to be **legible and honest** — a player should always be
> able to tell what something costs, what it's worth, and what they're giving up. Avoid
> dark patterns: no artificial urgency, no obscured odds, no confusing dual-currency
> conversions. This is a design constraint, not a footnote.

---

## 9. 3D board & avatars

Directional, but design should begin now so the 2D work doesn't paint us into a corner.

- **3D board.** A dimensional version of the ring. Needs: camera framing that keeps all 40
  tiles workable, how buildings rise, how ownership reads from an angle, and how the centre
  is used when it's no longer a flat panel.
- **3D avatars.** Player figures replacing flat tokens. Must stay distinguishable at
  **12 players**, at distance, and when several share a tile.
- **Relationship to 2D.** 2D stays the default and the fallback. Avatar identity should be
  **consistent across both** — the same character, flatter.
- **Cosmetics.** Avatars are the intended subject of the credit/marketplace economy, so
  variation and collectibility need to be designed in, not bolted on.
- **Performance & fallback.** What a device that can't run 3D sees, and how switching views
  feels.

---

## 10. Content design

- **Surprise and Treasure card text** — 3 + 3 tile positions, but a full deck each. Needs
  original writing with a consistent voice, plus a card design that handles varying text
  length and effect types (pay, collect, move, jail, get-out-of-jail).
- **Property names** — 22 cities currently named after real world cities. Open to a
  stronger, more distinctive naming concept.
- **Map identity** — if maps become marketplace items, each needs its own visual character.
- **Microcopy** — action labels, error messages, empty states, tooltips.

---

## 11. Cross-cutting states

Every surface needs these considered, not just the happy path:

- **Loading** — initial load, joining a room, waiting for the server
- **Empty** — no games played, no items owned, no rule sets published
- **Error** — connection lost, room not found, illegal action, server unreachable
- **Offline / reconnecting** — multiplayer disconnection is not currently designed for
- **Latency** — what the player sees between acting and the server confirming

---

## 12. Accessibility & responsiveness

Not optional, and cheaper to design in than to retrofit.

- **Colour independence.** 8 property groups and 12 player colours cannot rely on hue alone.
  Patterns, shapes, labels or position must carry the same information.
- **Contrast.** Target WCAG AA for text; state the intended standard.
- **Text scale.** Tile labels are the pressure point — they must survive larger type.
- **Motion.** Respect `prefers-reduced-motion`; token movement and dice are the main offenders.
- **Focus & keyboard.** The whole game should be playable without a mouse.
- **Screen reader.** Board state and turn changes need a non-visual representation.
- **Viewports.** Design for desktop, tablet and phone. **The phone case is unsolved** — a
  40-tile ring plus a 12-player roster on a 390px screen is a genuine design problem, and
  hot-seat on a phone is a plausible primary use case.

---

## 13. Deliverables

Per surface, ideally:

1. **Concepts** — at least two directions before converging; three for the board/shell (§2).
2. **Resolved design** — all states from the tables above.
3. **Responsive behaviour** — at the stated breakpoints.
4. **Motion notes** — what animates, how long, with which sound.
5. **Tokens** — colours, type, spacing expressed as values, so they can become code.
6. **Rationale** — a short note on why, especially where it departs from convention.

Anything expressible as a design token should be, since the implementation is
Tailwind-based and token-driven.

---

## 14. Suggested order

Foundations first, then the surfaces that carry the game, then the surfaces that don't exist yet.

1. **§4 Design system** — everything depends on it
2. **§2 Layout exploration** — decide the shell before detailing what sits in it
3. **§5 Board & tiles** — the game's centre of gravity; includes the ownership-legibility problem
4. **§6 In-game surfaces** — playable end to end
5. **§7 Setup & lobby** — the path into a game
6. **§8 Landing page** — the public face, needed for real testing
7. **§9 3D** — begin exploration in parallel; it informs avatar identity
8. **§8 economy & marketplace pages** — as those features approach
9. **§8 rule builder & wiki** — the largest and least-defined problem; last

---

## 15. What exists today, for reference only

Listed so designers know what's being replaced — **not** as a starting point.

**Built:** board with 40 tiles and fit-to-viewport scaling · colour bands on interior edges ·
label orientation toggle · animated tokens · dice · centre console · action bar · player
roster · event log + fading ticker · property detail, trade builder and bankruptcy modals ·
pass-and-play setup · online create/join/lobby · spectator mode · 24 synthesized sound effects.

**Stack:** React 18 + Tailwind + Zustand. Server-authoritative via Socket.io.
Live at `https://highrise.greenforrest.app` (LAN/Tailscale).
