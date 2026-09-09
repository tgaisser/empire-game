# Empire Game: Technical Architecture & Codebase Reference

## Overview & Heritage

This project is a modern web-based reimagining of the classic 1980s turn-based conquest strategy game **Empire** (originally conceived by Walter Bright in 1977 and popularized on MS-DOS in the 1980s as *Empire: Wargame of the Century* by Interstel and Mark Baldwin).

### Classic MS-DOS Empire Heritage
In the original DOS *Empire*:
- The world is an unexplored 2D grid of land, water, and neutral cities obscured by fog of war.
- Players explore uncharted territory, capture neutral cities using infantry (armies), and direct captured cities to construct military units.
- Combat is deterministic attrition between land, sea, and air forces.
- Success hinges on industrial expansion, recon, logistics, and amphibious invasions.

### Modern Enhancements in This Codebase
While preserving the austere strategic tension and retro aesthetic of the original, this implementation introduces substantial modern depth:
- **14 Specialized Unit Types** (up from ~6 in the original): Includes modern units like Choppers, Drone Swarms, SSBNs, Engineers, Scouts, and Special Ops.
- **Combined-Arms Logistics & Basing**: Aircraft have turn limits away from bases; carriers, airfields, and ports act as vital logistics nodes.
- **Ammunition & Resupply Economy**: Bombs, torpedoes, and cruise missiles are expendable ordnance requiring port/city/airbase replenishment for credits.
- **7 Tile Improvements**: Engineers can construct Bridges, Ports, Airfields, Tunnels, Radar installations, Outposts, and Minefields.
- **Information Warfare & Stealth**: Active sonar pings for detecting submarines, radar relay networks, stationary concealment for Special Ops, and last-known "ghost" radar contacts.
- **Staged AI Operations**: Multi-layered AI capable of planning coordinated amphibious operations (staging transports, escorts, and land forces at coastal sites before invasion).
- **Modern Web Technology**: Static Next.js 16 export, React 19, Pixi.js 8 hardware-accelerated battlefield FX canvas, and procedural Web Audio chiptune synthesis.

---

## Technology Stack & Build Pipeline

```
+--------------------------------------------------------------+
|                     Next.js 16 (App Router)                  |
|               Configured for Static Export (`out/`)          |
+--------------------------------------------------------------+
|  React 19 (Client-heavy UI)   |   Pixi.js 8 (Combat FX)      |
+-------------------------------+------------------------------+
|  Tailwind CSS 4 + Radix UI    |   Web Audio API (Procedural) |
+-------------------------------+------------------------------+
|  Pure TypeScript Game Engine (`lib/empire/`)                 |
|  - Immutable State Transitions (`applyCommand`)              |
|  - Deterministic Procedural World Gen                        |
|  - 6-Layer Strategic/Tactical AI Subsystem                  |
+--------------------------------------------------------------+
```

- **Framework**: Next.js `16.2.1` with `output: "export"`, producing standalone static HTML/JS/CSS in `out/`.
- **UI Framework**: React `19.2.4`, Framer Motion `12.38.0`, Lucide React, Radix UI / shadcn components.
- **Styling**: Tailwind CSS `v4` with CSS variables.
- **Map & FX Rendering**:
  - Virtualized DOM grid for tiles, terrain, cities, and unit markers (`GameMap.tsx` + `MapTile.tsx`).
  - Overlay canvas powered by Pixi.js `8.17.1` for hardware-accelerated projectile arcs, impacts, sonar ripples, and damage numbers (`BattlefieldFxOverlay.tsx`).
- **Audio Engine**: Pure Web Audio API procedural synthesis with zero external audio assets (`useEmpireAudio.ts`).
- **State Storage**: `localStorage` auto-saving with JSON file export/import (`saveLoad.ts`).

---

## Repository Map

```
c:\CODE\Gaisser.com\EmpireGame\
├── app/
│   ├── layout.tsx             # Root HTML layout & font setup
│   ├── page.tsx               # Primary page mounting <EmpireGame />
│   └── globals.css            # Tailwind 4 theme variables
├── components/
│   ├── empire/
│   │   ├── EmpireGame.tsx     # Master UI shell, modal orchestrator & layout
│   │   ├── audio/
│   │   │   └── useEmpireAudio.ts      # Web Audio procedural sound synthesizer
│   │   ├── hooks/
│   │   │   └── useEmpireGame.ts       # React state hook bridging engine <-> UI
│   │   ├── map/
│   │   │   ├── BattlefieldFxOverlay.tsx # Pixi.js 8 FX particle/rendering canvas
│   │   │   ├── battlefieldFxEvents.ts   # FX event transformation helpers
│   │   │   ├── GameMap.tsx              # Virtualized interactive map grid
│   │   │   └── MapTile.tsx              # Single tile DOM component
│   │   ├── panels/
│   │   │   ├── TopCommandBar.tsx        # Top status banner, turns, treasury, menu
│   │   │   ├── CommandPanel.tsx         # Selected unit info, action buttons
│   │   │   ├── CityPanel.tsx            # Selected city production selector
│   │   │   ├── StatusOverview.tsx       # Mini-map, force counters, explored %
│   │   │   ├── BattleLogPanel.tsx       # Turn log event feed
│   │   │   ├── BattleLogModal.tsx       # Expanded battle history log modal
│   │   │   ├── FieldManualModal.tsx     # In-game rules & unit encyclopedia
│   │   │   ├── StartGameModal.tsx       # New game / faction / map configuration
│   │   │   ├── DeveloperDrawer.tsx      # God-mode debug tools & test spawner
│   │   │   ├── EndgameOverlay.tsx       # Victory / Defeat end screen
│   │   │   └── ...                      # Modal confirmation dialogs
│   │   └── shared/
│   │       ├── domainStyles.ts          # Faction & unit badge style helpers
│   │       ├── unitCargo.ts             # Transport capacity helpers
│   │       ├── UnitTypeIcon.tsx         # Unit icon mapper
│   │       └── ImprovementIcon.tsx      # Improvement icon mapper
│   └── ui/                              # shadcn / Radix primitives (Button, Card, etc.)
├── docs/
│   ├── codebase-reference.md  # This document: architecture & technical guide
│   ├── developer-guide.md     # Engineering workflow and boundaries
│   ├── design-principles.md   # Core design philosophy and strategic pillars
│   ├── game-rules.md          # Comprehensive gameplay rules and systems
│   └── unit-stats-and-combat.md # Detailed unit stats, tables, and combat math
└── lib/
    └── empire/
        ├── types.ts           # Central TypeScript definitions (GameState, Unit, Tile...)
        ├── config.ts          # Map sizes, game types, world constants
        ├── game.ts            # Canonical pure rules engine & command executor
        ├── world.ts           # Procedural map generation algorithms
        ├── factions.ts        # 18 playable factions & leader data
        ├── catalog.ts         # Unit catalog sorting & metadata utilities
        ├── playerProfile.ts   # Local player profile persistence
        ├── saveLoad.ts        # Save game serializer & localStorage manager
        ├── ai/
        │   ├── engine.ts      # AI turn runner & playback recorder
        │   ├── planner.ts     # Turn planner: strategic goals -> operations -> missions
        │   ├── strategy.ts    # Strategic goal generation & threat evaluation
        │   ├── tactics.ts     # Local micro-tactics, combat choices & retreats
        │   ├── navigation.ts  # A* / Dijkstra pathfinding & target discovery
        │   ├── special.ts     # Special actions: engineers, bombers, cruise missiles
        │   └── diagnostics.ts # AI sanity checks and performance reports
        ├── data/
        │   ├── rules.ts       # Combat constants, reload costs, sight ranges
        │   ├── improvements.ts# Improvement definitions (costs, HP, turns)
        │   ├── units/         # JSON stat files for each unit type
        │   └── factions/      # JSON city lists for all 18 factions
        └── manual/            # In-game encyclopedia content files
```

---

## Core Engine Architecture (`lib/empire/`)

### 1. Pure State Machine & Command Pattern
The entire game engine in `lib/empire/game.ts` is structured around pure, immutable state transitions:

$$\text{GameState}_{t+1} = \text{applyCommand}(\text{GameState}_t, \text{Command})$$

- Neither the UI nor the AI directly mutates game state objects.
- All 22 command types pass through `applyCommand`:

| Command Type | Key Parameters | Function & Effect |
| :--- | :--- | :--- |
| `select_unit` | `unitId` | Sets `selectedUnitId`, clears targeting modes |
| `move_unit` | `side, unitId, x, y` | Validates domain terrain cost, expends `moveSpent`, steps along path, triggers fog updates |
| `attack_tile` | `side, unitId, x, y` | Resolves combat between units, updates HP/damage, records combat events, captures cities |
| `recruit_unit` | `side, unitType, x, y, spawnX, spawnY` | Queues production in a city with required turns and optional sea spawn point |
| `build_improvement` | `side, unitId, improvementType, x, y` | Assigns an Engineer to build a bridge, port, airfield, tunnel, radar, outpost, or minefield |
| `demolish_improvement` | `side, unitId, x, y` | Removes an improvement using an Engineer |
| `launch_cruise_missile`| `side, unitId, x, y` | SSBN or Carrier fires long-range missile at target tile |
| `sonar_ping` | `side, unitId` | Destroyer or Submarine pulses active sonar to detect hidden submarines |
| `jam_drone` | `side, unitId, x, y` | Carrier jams enemy Drone Swarm navigation within radius |
| `set_drone_target` | `side, unitId, x, y` | Directs autonomous Drone Swarm towards a coordinate |
| `special_ops_airstrike`| `side, unitId, x, y` | Special Ops paints target for precision standoff strike |
| `load_special_ops` | `side, carrierUnitId, specialOpsUnitId` | Transports Special Ops aboard a Submarine |
| `unload_special_ops` | `side, carrierUnitId, x, y` | Disembarks Special Ops onto adjacent land |
| `load_transport_troop` | `side, transportUnitId, troopUnitId` | Loads Infantry/Tank/Engineer/SpecOps into Troop Transport |
| `unload_transport_troop`| `side, transportUnitId, x, y` | Disembarks troop onto adjacent valid tile |
| `reload_ammo` | `side, unitId` | Pays credits at city/port/airfield to refill bombs, torpedoes, or missiles |
| `upgrade_unit` | `side, unitId, upgrade` | Upgrades Destroyer sonar or Carrier radar relay |
| `sentry_unit` | `side, unitId` | Puts unit in sentry mode (skips turn until enemy spotted) |
| `wake_unit` | `side, unitId` | Wakes sentry or fortified unit |
| `decommission_unit` | `side, unitId` | Scraps unit to recover portion of credits |
| `begin_turn` | `side` | Ages active sonar contacts, logs turn start, grants AI income |
| `end_turn` | `side` | Executes end-of-turn processing pipeline (see below) |

---

### 2. Turn Resolution Lifecycle

When `end_turn` is called for a side, the engine runs an ordered resolution pipeline:

```
[Player calls end_turn]
       │
       ▼
 1. Fortification Check ──────────> Units with unspent moves become fortified (+armor)
       │
       ▼
 2. Engineer Projects ────────────> Progress active improvement turns; spawn completed tiles
       │
       ▼
 3. City Production ──────────────> Progress unit production; spawn completed units
       │
       ▼
 4. Treasury Updates ─────────────> Add City Income + Map Exploration Bonus Credits
       │
       ▼
 5. Drone Swarm Resolution ───────> Autonomous swarms advance toward designated targets
       │
       ▼
 6. Logistics & Resupply ─────────> Air units at friendly bases refuel; isolated air units crash if out of turns
       │
       ▼
 7. Fog & Vision Recalculation ───> Update visible tiles, update last-known ghost markers
       │
       ▼
 8. Victory Evaluation ───────────> Check if either side owns all cities or eliminated all enemy forces
       │
       ▼
 9. Switch Turn / Invoke AI ─────> Switch side to "ai" -> AI executes turn -> AI calls end_turn -> Switch to "player"
```

---

### 3. Vision, Fog of War, and Stealth

The engine maintains asymmetric visibility grids for each side:
- `playerVisible` / `aiVisible`: Boolean grid of tiles currently within the line-of-sight of living units, cities, or radar stations.
- `playerIntel` / `aiIntel`: Historical snapshots of the map. A tile once seen remains in intel, but enemy units are removed when line-of-sight is lost.
- `playerLastKnown`: Array of `LastKnownUnit` ghost markers. When an enemy unit leaves vision, its last detected location and turn are saved.
- **Stealth & Submarines**:
  - Submarines are invisible unless adjacent to a Destroyer or revealed by an **Active Sonar Ping** (`sonarContacts`).
  - Special Ops units are concealed while stationary on land/mountain terrain.
  - Carrier Jamming can neutralize drone links in a sector.

---

### 4. Procedural Map Generator (`lib/empire/world.ts`)

Worlds are generated deterministically using a pseudorandom number generator (seeded RNG) and cellular automata:

1. **Game Types**:
   - `normal`: Balanced continents, seas, and inland lakes.
   - `naval`: High water fraction with archipelagos and river channels.
   - `archipelago`: Multiple isolated islands requiring immediate naval/air reach.
   - `ocean`: Expansive seas with scarce island clusters.
   - `alpine`: Mountain-heavy continents with narrow passes.
   - `globe`: Huge panoramic wrap-around style map.
   - `pangea`: Single vast landmass surrounded by ocean.
2. **World Sizes**:
   - Small ($20 \times 15$), Medium ($24 \times 18$), Large ($30 \times 22$), Huge ($36 \times 26$), Massive ($42 \times 30$), Globe ($52 \times 38$).
3. **Placement Logic**:
   - Player and AI start with one capital city each, positioned with fair separation.
   - Neutral cities are sprinkled uniformly, respecting minimum distance constraints.
   - Water and mountain features are seeded and iteratively smoothed using cellular automata kernels.

---

## AI Subsystem Architecture (`lib/empire/ai/`)

The AI does not cheat with raw omniscience by default; it plays using its own `aiIntel` and legal commands. Its decision-making is decomposed into six specialized layers:

```
                  +--------------------------+
                  |       ai/engine.ts       |  Turn runner & visible move playback
                  +--------------------------+
                               │
            +──────────────────┴──────────────────+
            ▼                                     ▼
+────────────────────────+            +────────────────────────+
|      ai/planner.ts     |            |      ai/strategy.ts    |
|  Builds turn plan,     | ◄───────── |  Strategic priorities, |
|  production queue      |            |  threat assessments,   |
+────────────────────────+            |  amphibious operations |
            │                         +────────────────────────+
            ▼
+────────────────────────+
|      ai/tactics.ts     |  Local threat/support scoring, engagement & retreat
+────────────────────────+
            │
     +──────┴──────+
     ▼             ▼
+───────────+ +───────────+
|navigation | |special.ts |  Pathfinding (A*/Dijkstra) & special actions
+───────────+ +───────────+  (Engineers, load/unload transports, airstrikes)
```

### Staged Amphibious Operations
A signature feature of the AI is staged expeditionary warfare:
1. When land forces are stranded on an island or coastal perimeter, `strategy.ts` detects the deficit in naval lift.
2. `planner.ts` puts production pressure on Troop Transports and Escort Destroyers.
3. Transports assemble at a coastal staging point.
4. Infantry/Tanks load aboard under destroyer escort.
5. Fleet transits across ocean toward enemy shores, landing troops onto beachheads to assault cities.

---

## UI and Rendering Pipeline (`components/empire/`)

### 1. Virtualized Grid Map (`GameMap.tsx`)
Rather than rendering thousands of static DOM elements for massive maps, `GameMap.tsx` calculates the visible viewport bounding box and renders only tiles within the screen window plus a configurable `TILE_BUFFER` (3 tiles).
- Supports drag-panning with pointer events.
- Tactical zoom levels from $1.0\times$ to $1.8\times$.
- Direction-aware Bridge rendering (horizontal/vertical orientations automatically computed from neighboring land tiles).

### 2. Pixi.js Canvas Overlay (`BattlefieldFxOverlay.tsx`)
A dedicated `<canvas>` element sits directly atop the DOM map grid, synchronized to the map's pan and zoom offsets:
- Runs a 60 FPS Pixi.js 8 render loop.
- Renders smooth ballistic projectile trajectories (bullets, artillery shells, missiles).
- Animated explosion impacts with radial debris particles.
- Expanding pulse rings for Sonar Pings.
- Floating combat damage numbers with upward drift and alpha fade.

### 3. Procedural Web Audio Engine (`useEmpireAudio.ts`)
Zero MP3/WAV files are bundled. All sounds are generated in real-time via the browser's `AudioContext`:
- Custom waveform recipes (sine, triangle, square, sawtooth) with frequency ramps and low-pass/high-pass biquad filters.
- Unique chiptune signatures for every unit type on selection (e.g. heavy bass sawtooth for Tanks, bright high-pitched sine for Scouts).
- Dynamic audio cues for machine-gun bursts, torpedo impacts, cruise missile launches, and sonar pings.

---

## Persistence & Developer Tools

### Save & Load System (`lib/empire/saveLoad.ts`)
- **Auto-Save**: Serializes the full `GameState` into `localStorage` (`"empire-autosave"`) at the start of each player turn.
- **Manual Export/Import**: Allows exporting the game state as a `.json` save file and re-uploading it at any time.
- **Versioning**: Saves include a schema version tag (`SAVE_VERSION = 2`) with backwards-compatible state hydration.

### Developer Drawer (`DeveloperDrawer.tsx`)
Pressing the Developer button opens a live debugging workbench:
- Toggle Fog of War / AI Omniscience.
- Force complete all city production instantly.
- Grant credits to Player or AI.
- Spawn any unit or tile improvement at arbitrary coordinates.
- Inspect current AI strategic goals, active operations, and unit threat scores.
- Trigger instant victory or defeat states.

---

## Code Quality, Health & Verification

- **Linting**: Clean (`npm run lint` passes with 0 errors).
- **TypeScript**: Strict mode enabled, 0 type errors.
- **Build**: Next.js 16 static export build completes cleanly in ~5 seconds.
- **Testing Status**: There is currently no automated test runner configured (Jest/Vitest/Playwright). Any logic changes should be manually verified using the developer panel and checked via `npm run build` and `npm run lint`.

---

## Roadmap & Potential Future Enhancements

1. **Automated Unit Testing Suite**: Introduce Vitest to test pure engine commands in `lib/empire/game.ts` without UI dependencies.
2. **Multiplayer / Pass-and-Play Hotseat**: Support 2-player human hotseat by toggling faction control.
3. **Touch Gestures on Mobile**: Add pinch-to-zoom and two-finger pan for mobile tablets and phones.
4. **Custom Map Editor**: A visual map designer to construct custom campaign scenarios.
5. **Campaign Mode**: Sequential historical/fictional scenarios with progression and unique victory objectives.
