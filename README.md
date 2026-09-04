# Richup

A locally-runnable Monopoly-style multiplayer board game. 2–4 humans + optional bots in a browser. Server-authoritative, pure-reducer game engine, Socket.io realtime.

## Quick start

```bash
pnpm install
pnpm dev
```

- Web: http://localhost:5173
- Server: http://localhost:3001

## How to play

1. Open http://localhost:5173 in **two browser tabs**
2. **Tab A**: Enter your name → **Create Room**
3. **Tab A** (Waiting Room): Click **+ Add Bot** one or two times → **Start Game**
4. **Tab B**: Enter a name, paste the room code → **Join**
5. Play! On your turn: Roll Dice → buy/decline/act → End Turn

## Board

40 tiles of original international cities (Tallinn → New York). Two card decks: **Surprise** and **Treasure**.

## Architecture

```
apps/
  server/    Node + Fastify + Socket.io (port 3001)
  web/       Vite + React 18 + Tailwind (port 5173)
packages/
  shared/    Pure game engine, Zod wire schemas, bot policy
```

Key invariant: **server is the only source of truth**. The reducer (`packages/shared/src/engine/reduce.ts`) is a pure function with no IO or randomness — dice and card draws are injected by the server's IO layer.

## Commands

```bash
pnpm test          # 70+ unit + integration tests
pnpm test:engine   # just the reducer tests
pnpm typecheck     # TypeScript strict mode
pnpm lint          # ESLint
```

## Decision log

- Deck shuffled at room creation (server IO); reducer pops top card → deterministic, replayable
- Trades with mortgaged property: mortgage transfers to new owner; 10% fee paid on unmortgage
- Airport rent: $25 / $50 / $100 / $200 for 1–4 airports
- Utility rent: 4× dice (1 owned), 10× dice (both owned)
- Auction all-pass: property stays unowned, turn advances
- Card → prison resets doublesStreak to 0
