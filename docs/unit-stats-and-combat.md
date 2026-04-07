# Unit Stats And Combat

This document consolidates the current unit values, improvement values, and implemented combat math into one reference. It exists because the repo currently spreads that information across unit JSON files, improvement data, and combat code.

If this document disagrees with the implementation in `lib/empire/game.ts`, `lib/empire/data/units/*.json`, or `lib/empire/data/improvements.ts`, the code and data files win.

## Source Of Truth

- Unit stat values: `lib/empire/data/units/*.json`
- Unit registry: `lib/empire/data/units/index.ts`
- Shared rules constants: `lib/empire/data/rules.ts`
- Improvement values: `lib/empire/data/improvements.ts`
- Combat, site capture, and special-case damage rules: `lib/empire/game.ts`

## Shared Rule Constants

These values are not per-unit, but they materially affect combat and operations.

| Constant | Value | Meaning |
| --- | ---: | --- |
| `EXPLORATION_INCOME_STEP` | 10 | `1` exploration income per `10%` explored map |
| `STATIC_SITE_VISION_RANGE` | 2 | Vision from owned cities, ports, airfields, and outposts |
| `CARRIER_AIR_CAPACITY` | 4 | Carrier aircraft capacity |
| `LAND_BASE_AIR_CAPACITY` | 1 | City / airfield aircraft capacity in current implementation |
| `RADAR_DETECTION_RANGE` | 5 | Radar air-detection range |
| `DESTROYER_ESCORT_RANGE` | 2 | Range for destroyer escort bonus on troop transports |
| `DESTROYER_ESCORT_ARMOR_BONUS` | 2 | Armor bonus to escorted troop transports |
| `CARRIER_JAM_RANGE` | 2 | Carrier drone-jamming range |
| `CARRIER_JAM_MAX_DAMAGE` | 5 | Max damage from carrier jamming |
| `MINEFIELD_DAMAGE` | 7 | Damage dealt by triggered minefields |
| `OUTPOST_MAX_HP` | 12 | Outpost structure HP |
| `OUTPOST_ARMOR` | 2 | Outpost structure armor |

## Unit Stats

These are the current base values loaded from the unit data files.

| Unit | Domain | Move | Atk | Armor | Piercing | Vision | HP | Cost | Build | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Infantry | land | 2 | 4 | 1 | 1 | 1 | 10 | 10 | 1 | Can capture |
| Scout | land | 3 | 1 | 0 | 0 | 3 | 6 | 8 | 1 | Can capture |
| Tank | land | 3 | 6 | 2 | 2 | 1 | 10 | 22 | 3 | Can capture; can attack air |
| Engineer | land | 2 | 2 | 0 | 0 | 1 | 10 | 12 | 1 | Can capture; detects spies |
| Spy | land | 3 | 0 | 0 | 0 | 3 | 1 | 9 | 1 | No attack; no capture; concealed while stationary |
| Special Ops | land | 3 | 7 | 0 | 3 | 2 | 8 | 18 | 2 | Can capture; concealed while stationary |
| Chopper | air | 4 | 5 | 1 | 5 | 3 | 8 | 18 | 2 | Ignores fortification; carrier-capable; transport `1` |
| Fighter | air | 6 | 6 | 1 | 3 | 4 | 8 | 20 | 2 | Air-to-air only; carrier-capable |
| Bomber | air | 7 | 7 | 0 | 3 | 3 | 7 | 24 | 3 | Land/sea attack; bomb load `6`; airfield-only landing |
| Drone Swarm | air | 5 | 8 | 0 | 2 | 0 | 2 | 14 | 2 | Self-destructs on attack; carrier-capable |
| Destroyer | sea | 3 | 5 | 2 | 2 | 2 | 10 | 20 | 2 | Anti-air bonus `+4`; can attack land/sea/air |
| Troop Transport | sea | 2 | 0 | 0 | 0 | 2 | 12 | 18 | 3 | No attack; transport capacity `3` |
| Carrier | sea | 4 | 4 | 2 | 1 | 3 | 14 | 34 | 5 | Anti-air bonus `+3`; air detection `5`; radar relay `5` |
| Submarine | sea | 4 | 10 | 1 | 8 | 1 | 7 | 24 | 3 | Sea attack only; sonar-only detection; concealed while stationary |

## Unit Abilities And Flags

These are the important non-numeric rules baked into the unit definitions.

### Capture And Attack Eligibility

- Can capture: Infantry, Scout, Tank, Engineer, Special Ops
- Cannot capture: Spy, all sea units, all air units
- Cannot attack at all: Spy, Troop Transport
- Fighter attack domains: air only
- Bomber attack domains: land and sea
- Destroyer attack domains: sea, land, and air
- Tank attack domains: land and air
- Submarine attack domains: sea only

### Concealment And Detection

- Concealed while stationary: Spy, Special Ops, Submarine
- Detects spies / concealed Special Ops by default: Infantry, Scout, Tank, Engineer, Special Ops, Spy
- Cannot detect spies: Chopper
- Submarines require sonar-upgraded destroyers for detection

### Air Basing

- Carrier-capable aircraft: Chopper, Fighter, Drone Swarm
- Airfield-only landing: Bomber
- `maxTurnsAwayFromBase: 2`: Chopper, Fighter, Bomber

### Special Payload Or Capacity

- Chopper transport capacity: `1`
- Troop Transport capacity: `3`
- Bomber bomb capacity: `6`
- Carrier air detection range: `5`
- Carrier radar relay range: `5`

## Transport And Capacity Rules

### Troop Transport Capacity

- Total capacity: `3`
- Infantry capacity cost: `1`
- Engineer capacity cost: `1`
- Spy capacity cost: `1`
- Special Ops capacity cost: `1`
- Tank capacity cost: `3`

### Chopper And Special Ops

- Chopper can carry Special Ops through the special-carried unit path
- This is separate from troop transport cargo

## Improvement Values

These are the current improvement values from `lib/empire/data/improvements.ts`.

| Improvement | Cost | Build Time | Extra Values |
| --- | ---: | ---: | --- |
| Bridge | 0 | 1 | Land crossing aid |
| Port | 8 | 3 | Naval production / embarkation |
| Airfield | 10 | 3 | Air production / basing |
| Radar Upgrade | 6 | 3 | Detection range `5`; upgrades airfield |
| Tunnel | 0 | 2 | Mountain crossing aid |
| Outpost | 2 | 3 | HP `12`, Armor `2` |
| Minefield | 4 | 2 | Trigger damage `7`; hidden until detected |

## Combat Formula

The current direct-combat math is implemented in `resolveCombat`.

### Attacker Damage To Defender

If the attacker is allowed to attack, defender damage is:

```text
clamp(
  attackerBaseAttack
  + random(0..2)
  - effectiveDefenderArmor
  - defenderFortificationReduction,
  1,
  9
)
```

Where:

- `attackerBaseAttack = attacker.atk + antiAirBonus` when the defender is an air unit
- `effectiveDefenderArmor = max(0, defender.armor + defenderArmorBonus - attacker.piercing)`
- `defenderFortificationReduction = 1` if defender is fortified and attacker does not ignore fortification, otherwise `0`

### Defender Retaliation Damage

If the defender can legally retaliate, attacker damage is:

```text
clamp(
  floor(defenderBaseAttack / 2)
  + random(0..1)
  - effectiveAttackerArmor,
  1,
  5
)
```

Where:

- `defenderBaseAttack = defender.atk + antiAirBonus` when the attacker is an air unit
- `effectiveAttackerArmor = max(0, attacker.armor - defender.piercing)`

### Important Implications

- Piercing reduces the target's armor directly.
- Anti-air bonus is folded into base attack only against air targets.
- Fortification is a flat `1` damage reduction, not a percentage.
- Damage always clamps to a minimum of `1` when an attack is valid.

## Special Combat Rules

### Submarine Versus Carrier

- If the attacker is a submarine and the defender is a carrier, the carrier is destroyed outright.
- The submarine takes no return damage from this rule path.

### Drone Swarm Damage Cap Against Surface Attackers

- If a drone swarm is the defender and the attacker is not an air unit, the drone swarm can take at most `2` damage from that attack.

### Chopper Fortification Ignore

- Choppers ignore fortification.
- They still interact with armor and piercing normally.

### Special Ops Follow-Up Attack

- Special Ops may attack twice in one engagement if:
  - they still had movement left after reaching the combat tile
  - both units survived the first strike

The second pass re-runs the normal combat formula with updated HP values.

## Tile Attack And Ammo Rules

### Bomber Strike Rules

- Bombers attack by tile-targeted strike
- Bombers require bombs remaining to attack
- Each bomber strike consumes `1` bomb
- Bombers do not automatically spend all remaining movement when they strike
- Bombers rearm when on a legal friendly base during end-of-turn airbase processing

### Drone Strike Rules

- Drone swarms attack assigned target tiles
- They self-destruct when the strike resolves
- They have a `10%` scatter chance to a random adjacent tile

## Site Defense And Capture Math

Strategic-site capture is not the same as ordinary combat.

### Site Support Count

- Count adjacent friendly units at distance `1`
- Cap support at `4`

### Site Base Defense

- City: `2 + support`
- Port: `2 + support`
- Airfield: `2 + support`
- Radar airfield: `4 + support`

### Capture Check

Capture succeeds if:

```text
attacker.atk + random(0..2) > max(0, siteDefense - attacker.piercing)
```

### Capture Notes

- Non-capturing units cannot occupy enemy strategic sites
- Capturing a city or capturable improvement clears production there

## Outpost Assault Math

Outposts use structure damage instead of the normal capture check.

Outpost damage is:

```text
clamp(
  attacker.atk + random(0..2) - max(0, OUTPOST_ARMOR - attacker.piercing),
  1,
  7
)
```

With:

- `OUTPOST_ARMOR = 2`
- `OUTPOST_MAX_HP = 12`

If outpost HP reaches `0`, the outpost is destroyed and removed.

## Escort, Radar, And Detection Values

### Destroyer Escort

- Only troop transports receive the escort armor bonus
- Requirement: friendly destroyer within range `2`
- Bonus granted: `+2` armor

### Radar

- Radar range: `5`
- Radar currently detects enemy air only
- Radar is an airfield upgrade, not a standalone site

### Static Site Vision

- Owned cities, ports, airfields, and outposts grant vision range `2`

## Minefields

- Minefield trigger damage: `7`
- Engineers disarm minefields by entering them
- Other land units trigger the mine and remove it
- Hidden minefields only appear in intel when the tile is visible and a friendly engineer is close enough

## Air Capacity

Current implementation:

- Carrier capacity: `4`
- Land base capacity: `1`

Design-intent note:

- The current `docs/game-rules.md` describes a future rule where airfields may have no hard cap and instead rely on concentration risk. That is not the current implementation.

## Gaps Between Current Implementation And Design Doc

The new `docs/game-rules.md` includes some future-facing design intent that is not fully present in the current stats / combat implementation yet. At the moment, these are documentation targets rather than current balance data:

- Heavy aircraft loadout system
- Chopper loadout refit system
- Static AA upgrade objects with their own HP and attack logic
- Mobile AA APC variant
- SSN / SSBN split
- Cruise missile rules
- Forward base gameplay objects
- Artillery unit stats and combat rules
- Unit rebalancing mechanic
- Infantry entrenchment as a distinct implemented stat layer beyond current fortification

If any of those systems get implemented, this file should be updated with their exact values and formulas immediately.
