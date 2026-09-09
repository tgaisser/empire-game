# Empire Game: Feature Tracking & Systems Checklist

This document tracks all gameplay features, unit mechanics, tile improvements, UI panels, and verification checklists across the codebase. Use this to track feature status, understand operational constraints, and perform structured manual QA.

---

## 1. Unit Types (14 Total)

All units are defined in `lib/empire/data/units/` and registered in `lib/empire/config.ts`.

| Unit | Domain | Move | Atk | Armor | Vision | Build Turns | Cost | Special Mechanics & Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Infantry** | Land | 1 | 2 | 0 | 1 | 5 | 0 | City capture capable. Baseline front-line unit. Transports can carry. |
| **Scout** | Land | 3 | 1 | 0 | 3 | 4 | 0 | Fast recon, low combat power. |
| **Tank** | Land | 2 | 4 | 1 | 1 | 8 | 0 | Heavy assault. Ignores fortification bonus on defenders. |
| **Engineer** | Land | 1 | 0 | 0 | 1 | 6 | 0 | Non-combatant. Can build all 7 improvements and demolish structures. |
| **Special Ops** | Land | 2 | 3 | 0 | 2 | 7 | 0 | City capture capable. Concealed while stationary. Can paint targets for standoff airstrikes. Can ride aboard submarines. |
| **Chopper** | Air | 4 | 3 | 0 | 2 | 6 | 0 | Fast tactical response. Ignores terrain costs. 2-turn base limit. |
| **Destroyer** | Sea | 3 | 3 | 1 | 2 | 8 | 0 | ASW specialist. Passive sub detection on adjacent tiles. Active Sonar upgrade available. Escort armor buff to adjacent friendlies. |
| **Troop Transport**| Sea | 2 | 0 | 1 | 1 | 8 | 0 | Carries up to 2 land units (Infantry, Tank, Engineer, SpecOps). Essential for amphibious invasions. |
| **Carrier** | Sea | 2 | 1 | 2 | 2 | 14 | 0 | Mobile airbase (stores aircraft). Cruise missile capability. Can jam enemy Drone Swarms. Radar relay upgrade available. |
| **Submarine** | Sea | 2 | 4 | 0 | 1 | 9 | 0 | Stealth: invisible unless pinged by active sonar or adjacent to Destroyer. Armed with torpedoes (reloadable). Transports 1 Special Ops. |
| **SSBN** | Sea | 2 | 1 | 1 | 1 | 16 | 0 | Strategic ballistic missile submarine. Fires long-range cruise missiles at cities/units. Stealth properties like Submarine. |
| **Fighter** | Air | 5 | 3 | 0 | 3 | 6 | 0 | Air superiority. Intercepts air units. High vision. 3-turn fuel away from base. |
| **Bomber** | Air | 4 | 5 | 0 | 2 | 10 | 0 | Heavy strategic bombardment. High attack vs cities and naval surface units. Limited bomb capacity (reloadable). 4-turn base limit. |
| **Drone Swarm** | Air | 3 | 4 | 0 | 2 | 5 | 0 | Autonomous guidance. Flies toward designated coordinates. Self-destructs on impact. Vulnerable to carrier jamming. |

---

## 2. Tile Improvements (7 Total)

Improvements are constructed by Engineers (`lib/empire/data/improvements.ts`).

| Improvement | Allowed Terrain | Build Turns | Build Cost | Operational Benefit |
| :--- | :---: | :---: | :---: | :--- |
| **Bridge** | Water | 3 | 10 | Connects separated landmasses. Land units cross water tiles as land terrain. Auto-orientates horizontally/vertically. |
| **Port** | Water (Coastal) | 4 | 15 | Coastal naval replenishment base. Allows sea units and troop transports to reload torpedoes/missiles and disembark. |
| **Airfield** | Land | 4 | 15 | Extends aircraft operational ranges into hostile territory. Serves as refueling, landing, and bomb-reloading base. |
| **Tunnel** | Mountain | 3 | 10 | Reduces mountain movement cost from 2 to 1 for land units. |
| **Radar** | Land / Mountain | 3 | 12 | Provides constant, long-range surface and air detection (Radius: 4), piercing standard fog of war. |
| **Outpost** | Land | 3 | 8 | Defensive fortification providing high armor bonus (+2) and sight range for garrisoned units. |
| **Minefield** | Water | 2 | 6 | Hidden until detected. Explodes on enemy naval vessels entering tile, dealing heavy damage. |

---

## 3. UI Panels & Interactive Modals

All UI components reside in `components/empire/`.

| Component | Role / Purpose | Trigger / Activation |
| :--- | :--- | :--- |
| **TopCommandBar** | Shows turn count, treasury, active player faction, victory status, End Turn button, Menu button | Persistent at top of screen |
| **CommandPanel** | Action buttons for selected unit (Move, Attack, Sentry, Fortify, Demolish, Special abilities) | Visible when a friendly unit is selected |
| **CityPanel** | Queue unit production, view turns remaining, assign sea-spawn exit tile | Visible when a city tile is selected |
| **StatusOverview** | Force counts (Land/Sea/Air), city ratios, explored % of world, mini-map overview | Persistent bottom right |
| **BattleLogPanel** | Rolling text log of turn events, attacks, and notifications | Bottom left overlay |
| **BattleLogModal** | Full scrollable history of combat logs and events | Click "Full Log" in BattleLogPanel |
| **FieldManualModal** | In-game encyclopedia explaining unit stats, mechanics, improvements, and tactical guides | Click "Field Manual" in TopCommandBar |
| **StartGameModal** | Game configuration: Player Faction, AI Faction, Game Type, World Size, Player Name | New game start / menu restart |
| **DeveloperDrawer** | God-mode controls: spawn units/improvements, add credits, toggle fog, run AI mirror simulations | "Dev Mode" toggle in menu |
| **EndgameOverlay** | Displays victory or defeat screen with final statistics and restart prompt | When `state.winner !== null` |
| **TargetActionModal**| Context menu when clicking a tile with multiple legal interactions (e.g. move vs board transport) | Ambiguous tile click |
| **NamePromptModal** | Dialog for renaming captured cities or designated flagship units | City capture or unit rename click |
| **BridgeConfirmModal**| Confirmation dialog when an engineer initiates bridge construction over water | Engineer clicks bridge build |
| **EndTurnConfirmModal**| Warning prompt if player clicks End Turn while units still have unspent movement points | End Turn with active units |
| **DecommissionConfirmModal**| Confirmation prompt before scrapping a unit for credits | Decommission button click |

---

## 4. Manual QA Verification Checklist

Because there are currently no automated unit tests, use this checklist to verify gameplay stability after modifying engine or UI code:

### Movement & Fog
- [ ] Land units cannot enter deep water tiles (unless crossing an existing Bridge).
- [ ] Sea units cannot traverse land tiles (unless entering a coastal Port or City).
- [ ] Air units fly freely over land, mountain, and water.
- [ ] Moving into fog reveals surrounding tiles according to unit's vision stat.
- [ ] Enemy units moving out of sight leave a `playerLastKnown` ghost marker.

### Combat & Abilities
- [ ] Attack command against an enemy tile reduces defender HP and applies counterattack damage if defender can retaliate.
- [ ] Destroyers adjacent to Submarines reveal their position.
- [ ] Active Sonar ping on a Destroyer or Submarine reveals submerged submarines within ping radius for 2 turns.
- [ ] Carrier Jamming successfully disables drone targeting.
- [ ] Special Ops Airstrike damages remote target without exposing unit.
- [ ] SSBN / Carrier Cruise Missile fires across map at valid intel targets.

### Logistics & Resupply
- [ ] Air units away from base have their turn counters decremented; crashing occurs if counter reaches zero without landing.
- [ ] Bombers that expend bombs cannot bomb again until reloaded at city or airfield for credits.
- [ ] Submarines with spent torpedoes can reload at cities or friendly ports for credits.
- [ ] Engineers take designated number of turns to complete improvements.

### Amphibious Invasions
- [ ] Troop Transport loads adjacent land unit (Infantry/Tank/Engineer/SpecOps).
- [ ] Troop Transport moves across ocean and unloads unit onto target land tile.
- [ ] Transport destroyed while carrying troops destroys all embarked units.

### Save / Load & Persistence
- [ ] Game auto-saves to `localStorage` at the start of each player turn.
- [ ] Refreshing browser page recovers the exact game state.
- [ ] Export save downloads a valid `.json` file; uploading the file restores the session cleanly.
