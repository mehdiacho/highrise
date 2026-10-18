# AGENTS.md

Context file for Codex when working on this repo. Read this every session before touching code.

## What this is

A multiplayer board game in the Monopoly family, server-authoritative, designed as a clone of richup.io. The full design spec is in `docs/richup-spec.md` — that doc is the source of truth for game rules and the domain model. This file is for engineering conventions.

## Architecture invariants — never violate these

1. **Server is the only authority on game state.** Client renders state and sends action intents. Never put rule logic in the client.
2. **The game engine is a pure reducer.** `packages/shared/src/engine/reduce.ts` exports `(state: GameState, action: Action) => { state: GameState; events: GameEvent[] }`. It must not call `Date.now()`, `Math.random()`, fetch anything, or produce side effects. Dice rolls and card draws are passed in as part of the action payload.
3. **Wire messages are typed with Zod, in `packages/shared/src/wire.ts`.** Both server handlers and client senders import the same schemas. Change the schema first, then let TypeScript flag everywhere that breaks.
4. **Randomness lives only in the server's IO layer.** The server rolls dice / draws cards, embeds the result in the action, then calls the reducer. Engine tests stay deterministic and games are replayable from an action log.
5. **No copying from richup.io.** Property names, prices, card text, and art must be original. The rules are uncopyrightable; the expression is not. If you find yourself typing names from their board, stop and invent.

## Stack

- pnpm workspaces
- TypeScript 5.x, strict mode
- `apps/server`: Node + Fastify + Socket.io
- `apps/web`: Vite + React 18 + Tailwind + Zustand
- `packages/shared`: types, Zod schemas, game engine, bot policy, map data
- Vitest for unit + integration tests
- ESLint + Prettier

## Repo layout

```
apps/
  server/
    src/
      index.ts             # Fastify boot
      rooms.ts             # Map<roomCode, RoomRuntime>
      socket.ts            # Socket.io message routing
      io/random.ts         # Dice + deck shuffling — only place randomness lives
    test/
      full-game.spec.ts    # End-to-end scripted game across socket clients
  web/
    src/
      lobby/               # Create/join screens
      game/                # Board, player panel, dice
      modals/              # Auction, trade builder, property detail
      state/               # Zustand store (mirror of server state)
      net/                 # Socket.io client wrapper
packages/
  shared/
    src/
      types.ts             # GameState, Player, Tile, Action, GameEvent
      wire.ts              # Zod schemas for all client↔server messages
      engine/
        reduce.ts          # Pure reducer — heart of the game
        rules.ts           # Helpers: rent calc, build evenness, bankruptcy
      data/
        default-map.json
      bot.ts               # Greedy bot policy
docs/
  richup-spec.md           # Source of truth for game rules
  roadmap.md               # Product scope & sequencing
  design-brief.md          # Open design request — treats the current UI as placeholder
  backlog.md               # What's built vs. not, tiered, with a suggested next three
```

## Run

```bash
pnpm install
pnpm dev           # boots server (3001) + web (5173) in parallel
pnpm test          # all packages
pnpm test:engine   # just the reducer tests
pnpm typecheck
pnpm lint
```

## Conventions

### TypeScript
- Strict mode. No `any` without a comment explaining why.
- Prefer discriminated unions over enums.
- Actions, card effects, and game events are discriminated unions tagged by `type`.
- No barrel files (`index.ts` re-exports) inside a package — import directly from the source file.

### State & data flow
- Server-authoritative state lives in `RoomRuntime.state: GameState` on the server.
- Client `useGameStore` mirrors via socket events. Never mutate it locally except for a brief optimistic dice flicker (then snap to server-confirmed state).
- IDs are short strings: `p_a3k9` players, `t_19` tiles (tile = position), `tr_jk2l` trades. Don't use UUIDs — log readability matters more than uniqueness across rooms.

### Naming — use the spec's terms, not Monopoly's
- **Start** (not Go), **Prison** (not Jail), **Vacation** (not Free Parking), **Go to Prison**
- **Surprise** cards (not Chance), **Treasure** cards (not Community Chest)
- **Airport** (not Railroad)
- "Build" / "buildings" generally; only the rent table fields use `house1..hotel`

### Testing
- Every reducer action gets a happy-path test + at least one edge-case test before that action is wired into the server.
- The integration test in `apps/server/test/full-game.spec.ts` spawns N socket clients and plays a scripted short game end-to-end. Keep it green.
- Bug found? Add a failing test first, then fix.

### Components
- No prop drilling more than 2 levels. Use Zustand selectors.
- Pages are dumb shells. Logic lives in hooks (`useTurnActions`, `useAuction`, `useTrade`).
- Tailwind classes inline. Add `clsx` only when class conditionals get ugly.

### Commits
- Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`).
- Scope is the package: `feat(engine): handle 3-doubles jail`, `fix(web): auction modal doesn't dismiss on close`.

### Errors
- Server: throw `GameRuleError` from the reducer for illegal actions. The socket layer catches and emits `{ event: "error", code, message }` to the offending client only — never to the room.
- Client: render errors as toasts. Never silently swallow.

### Don't do
- Don't add a DI container, factory, or abstract base class.
- Don't add a state management library besides Zustand.
- Don't add a UI library — Tailwind + raw components.
- Don't reach for Redis, Postgres, or any DB. V1 is in-memory.
- Don't add OAuth, accounts, or payments.
- Don't add `console.log` to production paths. Use a `log()` helper gated on `process.env.DEBUG`.

## Common gotchas

- **Build evenness**: legality check must also verify *no property in the group is mortgaged*. Easy to forget.
- **Bankruptcy: bank vs creditor**: different code paths. Creditor gets properties directly. Bank → properties are auctioned among remaining solvent players.
- **3-doubles jail**: the third roll is *consumed* but the move *doesn't happen*. Teleport to Prison instead of advancing.
- **Jail rent**: imprisoned players still collect rent on their properties. Don't gate rent collection on `!player.jail.inJail`.
- **Pass Start**: $200 is collected when *passing through*, not on landing. Landing on Start = $200, not $400.
- **Auction all-pass**: if every player declines, the property stays unowned and turn proceeds. The current player does NOT get a free re-buy.
- **Doubles after card → jail**: a Surprise/Treasure card that sends the player to Prison must reset the doubles streak. Don't grant an extra roll.
- **Trades with mortgaged property**: open question — does the recipient pay the 10% interest immediately, or keep it mortgaged and pay later? Pick one the first time it comes up and log it in the Decision log below.

## Decision log

When making a non-obvious choice the spec doesn't cover, append one line here. Format: `YYYY-MM-DD: chose X because Y`.

- 2026-08-06: airports priced $200, utilities $150 because the map data omitted `price` entirely, which made them unbuyable (`buy` threw NO_PRICE) and rendered "$?" in the UI; these values fit the existing airport rent ladder ($25/50/100/200) and the mortgage math already in `rules.ts`
- 2026-09-02: added a **hot-seat (pass-and-play) mode** that runs the whole game in-browser with no server — `apps/web/src/local/` (engine.ts replicates the server room factory + injects dice; store.ts is a Zustand store dispatching through the pure `reduce()`; actions.ts mirrors the socket senders). `App.tsx` now renders `SetupScreen` → `HotSeatGame`. Auctions have no turn pointer in the engine (free-for-all), so the store drives a round-robin "active bidder" for the shared screen — UI concern only, no engine change. Removed the socket-flow screens (GamePage/LobbyPage/WaitingRoom); `net/socket.ts` + `state/gameStore.ts` + the server are kept intact as the multiplayer transport to re-attach later on these same view components. Design direction: **premium dark** (tokens in tailwind.config.js + local/theme.ts)
- 2026-08-06: `reduce()` now appends its events to `state.log` (capped at the last 200) because `EventLog` renders `state.log` but nothing ever wrote to it — the socket layer discarded the reducer's `events`. Appending in the reducer keeps it pure and replayable and lets the client mirror the log for free, instead of adding a separate `log` wire message
- 2026-09-02: added `Player.kind?: 'human' | 'bot' | 'ai'` (optional, back-compat with `isBot` which stays true for both bot and ai). `bot` = deterministic `bot.ts` policy; `ai` = a future live-model driver that reasons over full board context. Setup now supports **up to 12 players** (12 token colors) with a per-seat kind selector. Product vision (12 players, 3D board, economy/marketplace, user-defined rule system, Firebase hosting at `[GAME_NAME].greenforrest.app` — **two R's**) captured in `docs/roadmap.md`
- 2026-09-02: **token movement animation** — tokens no longer live per-cell; `BoardRenderer` renders a single `TokenLayer` overlay over a GRID×GRID box (grid + overlay share one coord space, `tileCenter(pos)`), and `useHoppingPositions` advances each token one adjacent tile per 130ms tick (CSS `transform 120ms` per hop) so it walks the ring; a forward delta >12 (teleport/card) slides straight instead. Co-located tokens cluster in a `ceil(sqrt(n))` mini-grid. Per-cell `Tokens` component removed
- 2026-09-02: board UI pass — the board is **transform-scaled to fit the viewport height** (`useFitScale` in BoardRenderer measures the column and scales the natural 684px board), group **color bands sit on the interior-facing edge** (`edgeOf(position)` picks the side; corners have none), property-text **orientation is a store-backed settings toggle** (`boardSettings.textOrientation` — `uniform` reads L→R, `inward` rotates labels to face center via `inwardRotation(edge)`), and a **fading action ticker** (`animate-ticker`) shows the latest log event beneath the centerpiece. `boardSettings` lives in the Zustand UI store, not in `GameState`
- 2026-09-04: **multiplayer re-attached to the hot-seat views via a mode-aware `useGame` store** (`local/store.ts`). One store now carries `mode: 'local' | 'online'`; `dispatch(action)` runs the pure reducer in-browser when local, and in online mode maps the action to a wire message (`toWire`, which strips `playerId`/`dice` — the server infers the actor and rolls dice) and sends it, with incoming server `state` messages driving the store. Because `local/actions.ts` and every view already route through `useGame.dispatch`, the entire view layer plays online with **zero component changes**. In online mode `activeSeatId = myPlayerId` (fixed), so ActionBar's `isMyTurn`/`amInAuction` gating is correct per-client. Server change: `socket.ts` emits a `joined` message (`{playerId, roomCode}`) so a joiner learns its own id; `wire.ts` adds `JoinedMsg` and raises the room cap to 12. New online UI: `setup/HomeScreen.tsx` (Pass&Play | Online toggle), `setup/OnlineSetup.tsx` (create room / join by code), `setup/WaitingRoom.tsx` (lobby: room code + copy, player list, host Start/Add-bot). `App.tsx` routes `state===null → HomeScreen`, `status==='lobby' → WaitingRoom`, else `HotSeatGame`. Deleted the obsolete `state/gameStore.ts`. Verified end-to-end with two browser tabs (create/join/start/roll all sync; turn gating correct). **Deferred: hosting** — Firebase Hosting is static-only, so the Socket.io Node server still needs a host (Cloud Run / NAS / VPS)
- 2026-09-04: **hosting — one container on the NAS.** Fastify now serves the built web bundle (`@fastify/static` + SPA fallback, both gated on `WEB_ROOT`) alongside Socket.io on a single port, so client and server share an origin: no CORS, no `VITE_SERVER_URL`, one proxy host. `net/socket.ts` defaults `SERVER_URL` to `''` (same-origin); dev still works because `vite.config.ts` already proxies `/socket.io` and `/rooms` to 3001. Root `Dockerfile` + `docker-compose.yml` ship it as container `richup` on the `homelab` network, host port **8100** → container 3001. Base image must be `node:22-slim` — corepack pulls pnpm 11, which imports `node:sqlite` and dies on Node 20. `scp` doesn't work on the NAS, so the deploy path is `tar czf - … | ssh nassync 'cat > /volume1/docker/richup/src.tar.gz'` then untar + `docker compose up -d --build`. Service doc at `X:\Homelab\docs\richup_setup.md`
- 2026-09-04: **game renamed to Highrise** (wordmark, `<title>`, sound storage key). Internal package scopes stay `@richup/*` and the repo dir stays `richup` — renaming those is mechanical but touches every import and the NAS paths, so it's deferred until there's another reason to redeploy everything
- 2026-09-04: **spectator mode.** Joining a room whose game is already `in_progress` no longer errors — the server mints a throwaway `s_xxxx` id, marks the socket `spectator: true`, and echoes that flag on the `joined` message. Spectators are *not* added to `state.players` (so they don't affect turn order, the player cap, or bankruptcy), and `add_bot` / `start_game` / all game actions are refused server-side with a `SPECTATOR` error. Client-side `isSpectator` forces `activeSeatId = null`, which makes every existing control inert for free — ActionBar already renders the read-only "…'s turn" branch when `seatId` is null, so no view needed changing. A reconnect with a known `playerId` still resolves to that seat, so mid-game rejoin beats the spectator branch
- 2026-09-04: **repo put under git and pushed to GitHub** — `github.com/mehdiacho/highrise`, **private**, single `main` branch. Named for the game, not the directory: the local dir, package scopes (`@richup/*`), container and NAS paths all stay `richup`, consistent with the rename note above. `.gitignore` gained `.idea/`, `.vscode/`, `.Codex/settings.local.json` and `src.tar.gz`; `.Codex/launch.json` **is** tracked (shared dev-server config). Deploy is unchanged — the NAS has no deploy key, so it's still the tarball-over-SSH path, and `--exclude=.git` in that `tar` now actually excludes something
- 2026-09-04: **sound effects, synthesized not sampled** (`web/src/audio/`). `sfx.ts` builds all 24 sounds from oscillators and filtered noise buffers with gain envelopes — no assets to license, download, or ship, and nothing to preload. The `AudioContext` is created lazily and resumed from a passive `pointerdown`/`keydown` listener because browsers refuse audio before a gesture. `useGameSounds.ts` maps each `GameEvent` to a sound and plays newly appended `state.log` entries; because the reducer caps the log at 200, "new" is found by the **identity** of the last-played event (`log.lastIndexOf(prev)`), not by length. A `primed` ref adopts the tail silently on first sight so a spectator joining mid-game doesn't fire 200 sounds at once; batches are capped at 4, staggered 90ms. `rent_paid` plays as a gain or a loss depending on whether this client is the owner. Mute is a header toggle persisted in `localStorage` under `highrise.sound`

## When in doubt

1. Re-read the relevant section of `docs/richup-spec.md`
2. Check `packages/shared/src/types.ts` to see what the types already say
3. Write a failing test that expresses the behavior you think is correct
4. If the spec is silent, ask before inventing — then log the decision above
