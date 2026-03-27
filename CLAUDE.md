# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Build & Dev Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build (static export to out/)
npm run start    # Serve production build
npm run lint     # ESLint
```

No test framework is configured. There are no tests.

## Architecture

Turn-based conquest strategy game (inspired by classic DOS Empire) built with Next.js 16 (static export), React 19, TypeScript, Tailwind CSS 4, and Pixi.js.

### Core Layers

**Game Engine** (`lib/empire/`):
- `game.ts` — Core engine. All state transitions go through `applyCommand(state, command)` which returns a new immutable `GameState`. Contains 30+ command types (move_unit, attack_tile, recruit_unit, end_turn, improve_tile, etc.).
- `types.ts` — All type definitions (`GameState`, `Unit`, `Tile`, `City`, `Command`, etc.)
- `config.ts` — Game constants, unit stats table, terrain costs
- `world.ts` — Procedural map generation (multiple world types/sizes)
- `factions.ts` — 18 factions with city names, gradient colors, badge styling
- `catalog.ts` — Unit ordering/catalog utilities
- `data/` — JSON files for faction-specific city names and unit names

**AI Subsystem** (`lib/empire/ai/`): Multi-layer decision pipeline:
- `engine.ts` — Turn orchestration (`runAiTurnWithPlayback`)
- `planner.ts` — Builds `AiTurnPlan` with strategic goals and unit missions
- `strategy.ts` — Goal generation, threat assessment, mission assignment
- `tactics.ts` — Local threat/support evaluation, move selection
- `navigation.ts` — Pathfinding toward objectives
- `special.ts` — Domain-specific actions (engineer builds, bomber drops, transport load/unload)
- `diagnostics.ts` — AI debug reporting

**UI** (`components/empire/`):
- `EmpireGame.tsx` — Top-level game component, orchestrates all panels and the map
- `hooks/useEmpireGame.ts` — Primary game state hook (bridges engine ↔ UI)
- `audio/useEmpireAudio.ts` — Sound system
- `map/` — `GameMap.tsx` (tile grid), `MapTile.tsx`, battlefield FX overlay
- `panels/` — All UI panels: CommandPanel, CityPanel, StartGameModal, BattleLogPanel, EndgameOverlay, DeveloperPanel, etc.
- `shared/domainStyles.ts` — Unit badge colors, faction styling utilities

**UI Primitives** (`components/ui/`): shadcn/ui (radix-nova style) components.

### Key Patterns

- **Immutable state**: Game logic is pure — `applyCommand` returns new state, never mutates.
- **Coordinate hashing**: `key(x, y)` → `"x,y"` string used throughout for tile lookups.
- **Fog of war**: Separate `playerVisible`/`aiVisible` masks per side; vision computed from unit radii and city ownership.
- **3 unit domains**: Land, Sea, Air — each with distinct movement, combat, and terrain rules.
- **Path alias**: `@/*` maps to project root in imports.

### Tech Stack Details

- **Next.js 16.2.1** with static export (`output: "export"`)
- **Pixi.js 8** for map rendering
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **Lucide React** for icons
