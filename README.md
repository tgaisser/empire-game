# Empire Game

Turn-based conquest strategy game inspired by classic DOS Empire. The project is built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Pixi.js, and currently targets static export output.

## Purpose

This repository is split between two concerns:

- the game itself, including rules, AI, map generation, and UI
- the documentation that explains why those systems work the way they do

The markdown files in this repo are meant to capture project intent, not just setup commands. If a rule, constraint, or design choice keeps coming up in implementation discussions, it belongs in docs.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Other useful commands:

```bash
npm run build
npm run start
npm run lint
```

## Release Build For A Server

This project is configured for a static export in [next.config.ts](c:/CODE/SANDBOX/AI/FunLearning/Empire/empire-game/next.config.ts) with `output: "export"`.

That means the release build flow is:

```bash
npm install
npm run build
```

After `npm run build`, Next.js writes the deployable static site into the `out/` directory.

Do not run `npx next export` for this project. In current Next.js versions, `next export` has been removed in favor of `output: "export"` plus `next build`.

To publish to a server:

1. Run `npm run build`.
2. Copy the contents of `out/` to your web server or static hosting target.
3. Serve `out/` as plain static files from Nginx, Apache, S3, a CDN, or any other static host.

Notes:

- `npm run start` is for running a Next.js server build, but this repo is configured to ship as static files.
- Because this is a static export, server-only Next.js features are not available in production unless the deployment model changes.
- `images.unoptimized: true` is already set so the app can ship without a Next.js image optimization server.

## Documentation Map

- [docs/game-rules.md](docs/game-rules.md)  
  Gameplay rules, core systems, and the strategic model the implementation is trying to preserve.

- [docs/unit-stats-and-combat.md](docs/unit-stats-and-combat.md)  
  Consolidated unit values, improvement values, combat formulas, and balance constants from the current implementation.

- [docs/developer-guide.md](docs/developer-guide.md)  
  Developer-facing workflow, architectural boundaries, and repository conventions.

- [docs/design-principles.md](docs/design-principles.md)  
  Why the game is structured the way it is, including the reasoning behind engine, UI, and AI decisions.

- [CLAUDE.md](CLAUDE.md)  
  Concise coding-oriented reference for repository structure and core modules.

- [AGENTS.md](AGENTS.md)  
  Local agent instructions, including the requirement to verify Next.js behavior against the installed docs.

## AI Architecture

The AI in `lib/empire/ai/` is intentionally split into layers so strategy changes do not get buried inside movement heuristics.

- `strategy.ts` generates strategic goals, then converts them into explicit operations such as defense, expansion, recon, naval control, and amphibious assault.
- `planner.ts` builds the turn plan from those operations, including production pressure for stranded land forces, missile targets, ASW coverage, and expedition lift deficits.
- `special.ts` handles mission-aware nonstandard actions like troop loading, unloading, special-ops insertion, sonar pings, cruise-missile launches, paid reloads, jamming, and engineer construction.
- `navigation.ts` and `tactics.ts` execute the plan, including staging behavior, escort movement, retreat logic, and combat move selection.
- `engine.ts` runs the AI turn in execution order and logs the current priorities, operations, and missions.
- `diagnostics.ts` is the safety net for planner quality checks, expedition readiness, missile pressure, sonar coverage, and mirror simulations.

The current AI is no longer purely target-reactive. It now supports staged operations, including cases where land forces are trapped behind water and need transports, escorts, and a coastal staging site before an assault can happen.

## Combat And Command Events

The game engine now emits structured combat and sensor events from `lib/empire/game.ts` instead of relying only on human-readable log strings.

- `combatEvents` records visible attacks, missile strikes, and sonar pings in execution order.
- `sonarContacts` stores short-lived active-sonar detections so submarines can be revealed without turning standard fog-of-war into permanent x-ray vision.
- unit ammo state matters operationally: bombs, torpedoes, and cruise missiles can be spent and later reloaded at legal support sites for credits.

UI and audio systems that need battle playback or sound cues should prefer those event streams over parsing text logs.

## Source Of Truth Guidance

- `lib/empire/game.ts` is the gameplay execution source of truth.
- `lib/empire/types.ts` defines the canonical data model.
- `lib/empire/manual/` and `lib/empire/data/` capture player-facing rules and balance-oriented constants.
- The docs in `docs/` should explain intent and constraints, but they should not silently drift away from the implementation.

When changing rules or mechanics, update both the code and the relevant markdown file in the same change when practical.
