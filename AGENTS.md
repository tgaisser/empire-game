<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# AGENTS.md

Universal guide for AI coding assistants (Claude, Codex/ChatGPT, Antigravity, etc.) working on Empire Game.

## Project Overview

Turn-based conquest strategy game based on the classic 80s MS-DOS game *Empire: Wargame of the Century*.
- **Tech Stack**: Next.js 16 (Static Export), React 19, TypeScript, Tailwind CSS 4, Pixi.js 8 (combat FX canvas), Web Audio API (procedural chiptune sound).
- **Static Output**: Configured with `output: "export"` in `next.config.ts`. Do not use Node/server-only runtime features, API routes, or runtime SSR.

## Essential Commands

```bash
npm run dev      # Local dev server (localhost:3000)
npm run build    # Static production build to out/ (validates TypeScript & export)
npm run lint     # ESLint checks
```

*Note: No automated test suite is currently configured. Always verify changes with `npm run lint` and `npm run build`, and manually test gameplay paths (use Developer drawer / QA checklist in `docs/feature-tracking.md`).*

## Architectural Invariants (Must Follow)

1. **Engine is the Single Source of Truth**:
   - `lib/empire/game.ts` executes all rules. State transitions are pure and immutable: `applyCommand(state, command) -> GameState`.
   - Never invent gameplay rules, movement legality, or combat formulas inside React components or hooks.
   - Extend the `Command` union in `lib/empire/types.ts` when adding new actions.

2. **AI Follows the Same Rules**:
   - AI (`lib/empire/ai/`) must act through valid commands and `aiIntel` (fog of war), without omniscient cheats.
   - Maintain AI layering: `engine` (runner) -> `planner` (turns) -> `strategy` (goals) -> `tactics` (local scoring) -> `navigation` (pathing) -> `special` (engineers, air, transports).

3. **Coordinate System & Hashing**:
   - 2D grid `(x, y)` indexed `map[y][x]`.
   - Always use `key(x, y)` (`"${x},${y}"`) for tile hash lookups.

4. **Information Asymmetry**:
   - Fog of war (`playerVisible` vs `playerIntel`), submerged submarines, and concealed Special Ops are core balance mechanics. Never bypass them in client UI.

## Key Directories

- `lib/empire/` — Core game engine:
  - `game.ts`: Pure rules and command resolution.
  - `types.ts`: Canonical type definitions (`GameState`, `Unit`, `Tile`, `Command`).
  - `config.ts` & `data/`: Unit stats, improvements, world sizes, factions.
  - `ai/`: Multi-layer AI decision system.
  - `world.ts`: Deterministic procedural map generation.
- `components/empire/` — UI layer:
  - `EmpireGame.tsx`: Root UI orchestrator and dialog manager.
  - `hooks/useEmpireGame.ts`: Bridge between React UI and game engine.
  - `map/`: `GameMap.tsx` (virtualized DOM grid) and `BattlefieldFxOverlay.tsx` (Pixi.js FX canvas).
  - `panels/`: UI drawers, modals, command bars, and developer tools.
  - `audio/useEmpireAudio.ts`: Procedural Web Audio chiptune sound generator.

## Documentation Index

- `docs/codebase-reference.md` — Deep technical architecture, state flow, AI pipeline, and 80s DOS heritage.
- `docs/feature-tracking.md` — Complete unit/improvement matrices, UI catalog, and manual QA checklist.
- `docs/game-rules.md` — Detailed game rules, domains, and combat mechanics.
- `docs/unit-stats-and-combat.md` — Balance tables, unit stats, and combat formulas.
- `docs/developer-guide.md` — Developer workflow and architectural guardrails.
- `docs/design-principles.md` — Core design philosophy and strategic pillars.
