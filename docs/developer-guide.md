# Developer Guide

This document is for contributors working on the game codebase. It focuses on guardrails, workflow, and the boundaries between systems so that changes do not slowly erode the structure of the project.

## First Principles

- The game engine should remain the authority for rules and state transitions.
- UI code should describe and present state, not quietly invent gameplay.
- AI should use the same legal action model as the player whenever possible.
- Documentation should capture intent that would otherwise be rediscovered in future conversations.

## Start Here

Primary entry points:

- `app/page.tsx` mounts the main app page.
- `components/empire/EmpireGame.tsx` is the top-level game UI shell.
- `components/empire/hooks/useEmpireGame.ts` bridges UI events to engine commands.
- `lib/empire/game.ts` applies commands and returns the next immutable state.
- `lib/empire/types.ts` defines the shared model used by engine, AI, save/load, and UI.

If you are about to change gameplay behavior, read `lib/empire/game.ts` and the relevant manual or data files before editing UI components.

## Workflow

Use the standard local commands:

```bash
npm run dev
npm run build
npm run lint
```

There is currently no automated test suite. That means changes need tighter manual verification than a typical codebase.

At minimum, verify the specific gameplay path you changed and run `npm run lint` before treating the work as complete.

## Architectural Boundaries

### Engine

`lib/empire/game.ts` is the main rules executor.

Expected properties:

- state transitions are explicit
- command handling is centralized
- new rules are implemented once, not re-derived in multiple UI locations
- mutation should not leak across turns

The engine should answer questions like "is this move legal?" and "what happens after this command?", not the UI.

### UI

The UI layer in `components/empire/` should:

- render state clearly
- collect player intent
- present feedback, overlays, and panels
- avoid becoming a second rules engine

If a component contains complex legality logic that is not just display-oriented, it is a candidate for moving into the engine or a shared helper.

### AI

The AI in `lib/empire/ai/` is layered on purpose:

- `strategy.ts` decides what matters
- `planner.ts` turns that into a turn plan
- `tactics.ts` chooses local actions
- `navigation.ts` handles route decisions
- `special.ts` handles rule-heavy special cases
- `engine.ts` orchestrates execution and playback

Do not collapse those responsibilities casually. The separation exists because AI becomes unmaintainable once strategy, pathing, and execution details are mixed together.

## Documentation Rules

Add or update markdown when:

- a gameplay rule changes
- a new subsystem introduces non-obvious constraints
- a recurring design discussion keeps happening in chat or reviews
- a reason behind a rule is important for future contributors

Good candidates for docs include:

- "why this rule exists"
- "what must stay true even if implementation changes"
- "what kinds of shortcuts are intentionally avoided"

Bad candidates for docs include:

- comments that merely repeat what the code obviously does
- stale task notes with no lasting value
- speculative design that is not connected to current behavior

## Project-Specific Guardrails

- Preserve immutable state transitions in gameplay code.
- Prefer extending the command model over adding special-case UI mutations.
- Keep player-facing rules aligned with `lib/empire/manual/` and `lib/empire/data/`.
- Treat fog, logistics, and combined arms as core pillars, not optional flavor.
- Keep documentation close to the implementation reality. Aspirational docs are fine, but they should be labeled as such.

## Next.js Note

This repository includes an explicit warning in `AGENTS.md`: the installed Next.js version may differ substantially from older assumptions.

If you are making framework-level changes, read the relevant installed docs under `node_modules/next/dist/docs/` before coding. Do not rely on memory alone for Next.js conventions in this repo.

## When Adding New Docs

Prefer this structure:

- update `README.md` when the document should be discoverable from the repo root
- put lasting project docs under `docs/`
- keep agent- or tool-specific instructions in `AGENTS.md` or similar root instruction files
- keep in-game player reference material tied to `lib/empire/manual/` when it needs to match shipped UI behavior closely

The goal is simple: future contributors should know where to put rule explanations before they invent another disconnected note file.
