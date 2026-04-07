# Unit Stats And Combat

This document consolidates the working unit values, improvement values, and intended combat math into one reference. It exists because the repo currently spreads that information across unit JSON files, improvement data, and combat code.

This version is the current balance-pass working reference for the next implementation pass.

If this document disagrees with the implementation in `lib/empire/game.ts`, `lib/empire/data/units/*.json`, or `lib/empire/data/improvements.ts`, the code and data files win until the code is updated to match this file.

## Shared Rule Constants

| Constant | Value | Meaning |
| --- | ---: | --- |
| `EXPLORATION_INCOME_STEP` | 10 | `1` exploration income per `10%` explored map |
| `STATIC_SITE_VISION_RANGE` | 2 | Vision from owned cities, ports, airfields, and outposts |
| `RADAR_DETECTION_RANGE` | 5 | Radar air-detection range |
| `DESTROYER_ESCORT_RANGE` | 2 | Range for destroyer escort bonus on troop transports |
| `DESTROYER_ESCORT_ARMOR_BONUS` | 2 | Armor bonus to escorted troop transports |
| `CARRIER_JAM_RANGE` | 2 | Carrier drone-jamming range |
| `CARRIER_JAM_MAX_DAMAGE` | 5 | Max damage from carrier jamming |
| `MINEFIELD_DAMAGE` | 7 | Damage dealt by triggered minefields |
| `OUTPOST_MAX_HP` | 12 | Outpost structure HP |
| `OUTPOST_ARMOR` | 2 | Outpost structure armor |
| `AIR_SUPPORT_PER_CITY` | 2 | Total aircraft support capacity granted per owned city |
| `CITY_SURFACE_CAPACITY` | 2 | Friendly surface-unit garrison capacity inside an owned city |
| `ASW_DESTROYER_SUB_ATTACK_BONUS` | 2 | Bonus attack applied by ASW destroyers against submarines |

## Unit Stats

| Unit | Domain | Move | Atk | Armor | Piercing | Vision | HP | Cost | Build | Notes |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Infantry | land | 2 | 4 | 2 | 1 | 1 | 10 | 10 | 1 | Can capture; light AA `+1` |
| Scout | land | 3 | 1 | 0 | 0 | 3 | 6 | 8 | 1 | Can capture |
| Tank | land | 3 | 6 | 2 | 2 | 1 | 10 | 22 | 3 | Can capture; can attack air |
| Engineer | land | 2 | 2 | 0 | 0 | 1 | 10 | 12 | 1 | Can capture; detects concealed Special Ops |
| Special Ops | land | 3 | 5 | 0 | 3 | 3 | 8 | 18 | 2 | Can capture; concealed while stationary; stealth recon; city-capped production |
| Chopper | air | 4 | 5 | 1 | 5 | 3 | 8 | 18 | 2 | Ignores fortification; carrier-capable; transport `1` |
| Fighter | air | 6 | 5 | 1 | 3 | 4 | 8 | 20 | 2 | Air-to-air only; carrier-capable |
| Bomber | air | 7 | 7 | 0 | 3 | 3 | 7 | 24 | 3 | Land/sea attack; bomb load `6`; airfield-only landing |
| Drone Swarm | air | 5 | 8 | 0 | 2 | 0 | 2 | 14 | 2 | Self-destructs on attack; carrier-capable |
| AA / Radar Destroyer | sea | 3 | 5 | 2 | 2 | 2 | 10 | 22 | 2 | Anti-air bonus `+5`; radar air detection `5`; does not detect submarines |
| ASW / Sonar Destroyer | sea | 3 | 5 | 2 | 2 | 2 | 10 | 22 | 2 | Anti-air bonus `+2`; detects submarines; `+2` attack vs submarines |
| Troop Transport | sea | 2 | 0 | 0 | 0 | 2 | 12 | 18 | 3 | No attack; transport capacity `3` |
| Carrier | sea | 4 | 4 | 2 | 1 | 3 | 14 | 34 | 5 | Anti-air bonus `+3`; air detection `5`; radar relay `5`; no instant-kill exception from submarine attacks |
| SSN | sea | 4 | 8 | 1 | 5 | 1 | 6 | 26 | 4 | Sea attack only; concealed while stationary; torpedoes `6`; cruise missiles `1`; Spec Ops insertion |
| SSBN | sea | 4 | 6 | 1 | 4 | 1 | 7 | 30 | 5 | Defensive torpedo `1`; cruise missiles `6`; up to `3` launches per turn if it keeps `1` move in reserve |

## Unit Abilities And Flags

### Capture And Attack Eligibility

- Can capture: Infantry, Scout, Tank, Engineer, Special Ops
- Cannot capture: all sea units, all air units
- Cannot attack at all: Troop Transport
- Fighter attack domains: air only
- Bomber attack domains: land and sea
- Tank attack domains: land and air
- AA / Radar Destroyer attack domains: sea, land, and air
- ASW / Sonar Destroyer attack domains: sea, land, and air
- SSN direct attack domains: sea only
- SSBN direct torpedo attack domains: sea only
- Cruise missiles target land only

### Concealment And Detection

- Concealed while stationary: Special Ops, SSN, SSBN
- Detects concealed Special Ops by default: Infantry, Scout, Engineer, Special Ops
- Tanks do not detect concealed Special Ops by default
- Only ASW / Sonar Destroyers detect submarines by default

### Air Basing

- Carrier-capable aircraft: Chopper, Fighter, Drone Swarm
- Airfield-only landing: Bomber
- `maxTurnsAwayFromBase: 2`: Chopper, Fighter, Bomber
- Total aircraft support capacity = `2 x owned cities`

### Special Payload Or Capacity

- Chopper transport capacity: `1`
- Troop Transport capacity: `3`
- Bomber bomb capacity: `6`
- Carrier air detection range: `5`
- Carrier radar relay range: `5`
- SSN torpedoes: `6`
- SSN cruise missiles: `1`
- SSBN torpedoes: `1`
- SSBN cruise missile load: `6`
- SSN homeport limit: `1` per port
- SSBN homeport limit: `1` per port

### Anti-Air Notes

- Infantry has light AA value `+1`
- AA / Radar Destroyer anti-air bonus is `+5`
- ASW / Sonar Destroyer anti-air bonus is `+2`
- Carrier anti-air bonus is `+3`

## Transport And Capacity Rules

### Troop Transport Capacity

- Total capacity: `3`
- Infantry capacity cost: `1`
- Engineer capacity cost: `1`
- Special Ops capacity cost: `1`
- Tank capacity cost: `3`

### Chopper And Special Ops

- Chopper can carry Special Ops through the special-carried unit path
- This is separate from troop transport cargo

## Improvement Values

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
- `attackerBaseAttack = attacker.atk + ASW_DESTROYER_SUB_ATTACK_BONUS` when an ASW / Sonar Destroyer attacks a submarine
- `effectiveDefenderArmor = max(0, defender.armor + defenderArmorBonus - attacker.piercing)`
- `defenderFortificationReduction = 1` if defender is fortified and attacker does not ignore fortification, otherwise `0`
- `defenderFortificationReduction = 2` for entrenched infantry when the entrenchment layer is applied

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
- ASW destroyer bonus is folded into base attack only against submarine targets.
- Fortification is a flat damage reduction, not a percentage.
- Standard fortification is `1`.
- Entrenched infantry uses `2`.
- Damage always clamps to a minimum of `1` when an attack is valid.

## Special Combat Rules

### Submarine Versus Carrier

- The previous instant-kill submarine-versus-carrier rule is removed.
- Carriers are now intended to die in roughly two successful torpedo attacks from an SSN instead of one automatic special-case attack.

### Drone Swarm Damage Cap Against Surface Attackers

- If a drone swarm is the defender and the attacker is not an air unit, the drone swarm can take at most `2` damage from that attack.

### Chopper Fortification Ignore

- Choppers ignore fortification.

### Special Ops Follow-Up Attack

- Special Ops may attack twice in one engagement if:
  - they still had movement left after reaching the combat tile
  - both units survived the first strike

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

### Cruise Missile Rules

- Cruise missiles require a visible or recently detected land target
- If the exact target is gone but a valid enemy target is in an adjacent tile, the missile may redirect there
- If no valid target remains, the missile misses
- Each Attack Sub missile launch consumes the submarine's full turn
- SSN carries `1` cruise missile
- SSBN carries `6` cruise missiles
- SSBNs may fire up to `3` missiles in one turn, but each launch costs `1` move and requires at least `1` move still available before firing
- SSBN next-turn movement is reduced by the number of missiles it fired on the previous turn, up to `3`

### Torpedo Rules

- SSN carries `6` torpedoes
- SSBN carries `1` torpedo intended mainly as a defensive snapshot

## Site Defense And Capture Math

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

## Escort, Radar, And Detection Values

### Destroyer Escort

- Only troop transports receive the escort armor bonus
- Requirement: friendly destroyer within range `2`
- Bonus granted: `+2` armor

### Radar

- Radar range: `5`
- Radar detects enemy air only
- Radar is an airfield upgrade, not a standalone site

### Static Site Vision

- Owned cities, ports, airfields, and outposts grant vision range `2`

## Minefields

- Minefield trigger damage: `7`
- Engineers disarm minefields by entering them
- Other land units trigger the mine and remove it

## Logistics Caps And Production Limits

### Special Ops

- Maximum producible Special Ops = current owned city count

### Ports

- Each owned coastal city counts as a port
- Additional port improvements may exist only if total port count does not exceed owned city count

### Submarines

- Per port limit: `1` SSN and `1` SSBN

### Aircraft

- Total aircraft support capacity = `2 x owned cities`
- Aircraft may still be concentrated at one field if desired

## Applied Balance Changes In This Working Backup

- Infantry armor increases from `1` to `2`
- Infantry receives light AA value `+1`
- Entrenched infantry uses defensive reduction `2`
- Special Ops attack reduces from `7` to `5`
- Special Ops vision increases from `2` to `3`
- Fighter attack reduces from `6` to `5`
- Destroyers split into AA / Radar and ASW / Sonar configurations
- Destroyer cost sets to `22`
- SSN attack sets to `8`
- SSN piercing sets to `5`
- SSN HP sets to `6`
- SSN cost sets to `26`
- SSN build time sets to `4`
- SSBN is introduced as a separate submarine class
- SSBN cost sets to `30`
- SSBN build time sets to `5`
- The instant submarine-versus-carrier kill rule is removed
- Special Ops production is capped by city count
- Port count is capped by city count
- Submarine production is capped per port
- Total aircraft support capacity is tied to owned city count
