# Highrise — Build Backlog

> What exists, what doesn't, and what's worth doing next.
> Scope and rationale live in [`roadmap.md`](roadmap.md); design work is requested in
> [`design-brief.md`](design-brief.md); game rules are in [`richup-spec.md`](richup-spec.md).
> Last reviewed: 2026-09-04.

---

## ✅ Done

**Engine & rules** — pure reducer · dice/card injection · rent (incl. airport ladder and
dice-multiplied utilities) · build evenness · mortgage/unmortgage · auctions · trades ·
prison (3-doubles, fine, card) · bankruptcy to bank and to creditor · pass-Start · taxes ·
Surprise/Treasure decks · win condition · event log capped at 200.

**Client** — 40-tile board, fit-to-viewport · interior colour bands · label orientation
toggle · animated hopping tokens with co-location clustering · dice · centre console ·
action bar · player roster · event log + fading ticker · property/trade/bankruptcy modals ·
pass-and-play setup for 2–12 seats · seat kinds in setup (human/bot/ai).

**Multiplayer** — mode-aware store (one store, local or online) · create/join by room code ·
waiting room with host controls · server-authoritative dice and bot turns · spectator mode
for joining a game in progress · reconnect to a known seat.

**Bots** — deterministic greedy policy, server-driven.

**Audio** — 24 synthesized Web Audio sounds mapped to game events, with mute persisted.

**Infrastructure** — single container (Fastify serves the web bundle + Socket.io on one
origin) · deployed to the NAS on port 8100 · Let's Encrypt wildcard cert ·
`https://highrise.greenforrest.app` on LAN/Tailscale.

---

## 🔨 Not built

Grouped by what unblocks what. Effort is rough: **S** hours · **M** a day or two · **L** a week+ ·
**XL** a project in its own right.

### Tier 1 — completes the game as a game

| # | Item | Effort | Why |
|---|---|---|---|
| 1 | **Ownership legibility on the board** | S | You buy a property and it isn't obvious you own it. Named as a specific problem in the design brief; the smallest change with the biggest felt improvement. |
| 2 | **Design system + visual pass** | XL | Everything currently on screen is a placeholder. Gated on the design brief. |
| 3 | **Reconnect / disconnect UX** | M | The server keeps the seat, but a dropped client has no visual story. Currently the worst multiplayer gap. |
| 4 | **Settings surface** | S | Two controls stranded in the header; no home for rules toggles, sound, map choice. |
| 5 | **Own-player summary** | S | You hunt the roster for your own cash and holdings. |
| 6 | **Mobile layout** | L | Unsolved. A 40-tile ring plus 12-player roster at 390px. Hot-seat on a phone is a plausible primary use case. |
| 7 | **Turn timer / idle handling** | M | One idle player currently stalls a 12-player game indefinitely. |
| 8 | **Game-over screen** | S | A trophy emoji. It's the moment people screenshot. |

### Tier 2 — the AI seat

| # | Item | Effort | Why |
|---|---|---|---|
| 9 | **AI turn driver** | L | `Player.kind: 'ai'` exists and setup offers it, but nothing drives it — it currently falls through to the deterministic bot. Assemble board context → call model → map response to engine `Action`s, through the same `reduce()` so replays hold. |
| 10 | **AI guardrails** | M | Illegal-move retries, latency ceiling, cost ceiling, fallback to the deterministic bot. |
| 11 | **AI personality/difficulty** | M | Distinguishable opponents; a differentiator against every other Monopoly clone. |

### Tier 3 — accounts & persistence

| # | Item | Effort | Why |
|---|---|---|---|
| 12 | **Persistence layer** | L | V1 is deliberately in-memory; a restart drops live games. Everything below needs a real store. |
| 13 | **Accounts / auth** | L | |
| 14 | **Game history & replay** | M | The action log already makes games replayable — this is mostly surfacing what exists. |
| 15 | **Stats & metrics** | M | |
| 16 | **Scoring & leaderboards** | M | |

### Tier 4 — public reach

| # | Item | Effort | Why |
|---|---|---|---|
| 17 | **Cloudflare Tunnel ingress** | S | Starlink CGNAT blocks inbound. Off-LAN currently gets a Cloudflare 525. Only thing between us and outside testers. |
| 18 | **Landing / marketing page** | M | Needed before anyone unfamiliar can be pointed at it. |
| 19 | **Room links** | S | Share a URL instead of dictating a 6-character code. |

### Tier 5 — 3D

| # | Item | Effort | Why |
|---|---|---|---|
| 20 | **3D board view** | XL | 2D stays default and fallback. |
| 21 | **3D avatars** | XL | Must survive 12 players; the subject of the cosmetics economy. |
| 22 | **View switching + perf fallback** | M | |

### Tier 6 — economy

| # | Item | Effort | Why |
|---|---|---|---|
| 23 | **Credits / wallet** | L | |
| 24 | **Payments** | L | Real money — needs care, and it's the point at which this stops being a hobby project legally. |
| 25 | **Avatar / item store** | L | |
| 26 | **Item trading with confirm step** | M | |
| 27 | **Scarcity market + valuation** | XL | The most speculative item in the roadmap. |
| 28 | **Dual-tier dynamic currency** | XL | Design it honestly or not at all — see the design brief's note on dark patterns. |

### Tier 7 — content & community

| # | Item | Effort | Why |
|---|---|---|---|
| 29 | **Multiple maps** | M | Engine already takes map data; needs more maps and a picker. |
| 30 | **Map marketplace** | L | |
| 31 | **Game modes / rule variants** | L | |
| 32 | **Enumerate engine rule hooks** | M | **Prerequisite for everything below.** The set of points a custom rule can attach to (rent calc, landing, pass-Start, turn order…). Nothing user-defined is possible until this exists. |
| 33 | **Rule syntax + builder UI** | XL | |
| 34 | **Rule wiki: publish, de-dupe, vote, apply** | XL | |

---

## 🧹 Known debt

| Item | Note |
|---|---|
| **Package naming** | Game is Highrise; repo dir, `@richup/*` scopes, container and NAS paths are all `richup`. Deliberate — mechanical to change, touches every import. |
| **`isBot` vs `kind`** | Both exist for back-compat. `isBot` is true for bot *and* ai. Worth collapsing once the AI driver lands. |
| **No persistence** | Restart drops live games. Intentional for V1; blocks Tier 3. |
| **Trade + mortgaged property** | Rule decided (mortgage transfers, 10% at unmortgage) but worth an explicit test. |
| **Auction turn pointer** | Engine treats bids as free-for-all; the round-robin bidder is a client-side fiction for the shared screen. Fine for hot-seat, needs thought if auctions ever get a timer. |
| **No E2E tests for online** | `full-game.spec.ts` covers sockets; spectator, reconnect and the lobby are untested. |

---

## Suggested next three

1. **#17 Cloudflare Tunnel** — small, and it's the difference between "I can play this" and "we can play this". Unblocks real testing.
2. **#1 Ownership legibility** — small, fixes the thing that actually annoyed you while playing.
3. **#9 AI turn driver** — the feature nothing else has, and the seat kind is already plumbed through setup and the data model.

Then **#2**, the visual pass, once the design brief comes back with directions.
