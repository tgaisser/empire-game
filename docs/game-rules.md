# Game Rules

This document explains the implemented and intended ruleset at a system level. It is written for developers first, but it should stay readable enough that designers and future contributors can use it to understand the real game behavior, the design direction, and the edge cases that materially affect play.

If this document disagrees with the actual behavior in `lib/empire/game.ts`, the code wins until the mismatch is resolved. When new rules are added here before full implementation lands, treat them as authoritative design intent for the next rules pass.

## Core Philosophy

The game is built around a few persistent design priorities:

- Systems matter more than individual units.
- Information matters more than raw power.
- Logistics matter more than convenience.
- Clarity matters more than hidden mechanics.

That means the game should reward planning, combined arms, and infrastructure. A unit should be strong because the rest of the system makes it strong, not because it bypasses the rest of the game.

## Core Loop

Each turn is about converting position into production, and production into control.

The normal flow is:

1. Reveal information with scouts, Special Ops, radar, fleets, and air units.
2. Move units to improve position, attack, reinforce, or stage future attacks.
3. Queue production and start engineer projects where the map supports them.
4. End the turn. Stationary units fortify, income is paid, production queues advance, project timers advance, drone orders resolve, and airbase recovery logic runs.
5. Repeat until one side has no cities and no units left.

The game rewards system pressure more than isolated duels. Capturing or disabling a key city, port, airfield, forward base, or logistics route usually matters more than trading evenly on a random front.

## Win And Loss

- A side only loses when it has both zero cities and zero units remaining.
- Losing all cities is not by itself defeat if units still survive.
- Losing all units is not by itself defeat if at least one city still survives.
- Capturing cities matters because cities are both economy and production nodes, but elimination is not complete until the side has no surviving field presence either.
- Air and naval power can shape the map, but land control is what closes the game out.

## Turn Structure

- The player gains income at the end of the player turn.
- The AI gains income at the beginning of the AI turn.
- Production and projects do not resolve instantly when queued. They tick down on turn transition.
- End-of-turn effects are an important part of balance. Engineers, entrenchment, repairs, concealment refresh, and base-related behavior all live here conceptually even when they originate from different systems.

## Economy

- Cities are the main production and income nodes.
- A city only produces income when it is idle. A city that is currently building a unit does not generate its normal city income that turn.
- Base city income is `6` credits per idle city.
- Exploration income is `floor(explored map percent / 10)`.
- Unit cost is paid up front when production is queued, not when the unit spawns.
- Engineer projects also commit their cost up front when construction starts.

## Exploration And Intel

- Exploration is tracked from each side's own intel map, not from the full real map.
- Vision and detection are separate systems.
- A tile can be visible without every enemy unit on it being legally detected.
- Movement also reveals. Units reveal tiles along their movement path during the turn, not just from their final position.

### Last Known Position

- When an enemy unit is detected, the intel layer preserves a last known position marker.
- Last known markers last `1` turn unless refreshed.
- The player should know where the enemy was last positively identified, not where the enemy certainly is now.

## Land Ownership

- Tiles have an owner state: player, enemy, or neutral.
- Ownership affects who may build on the tile.
- Ownership affects who may deploy from the tile.
- Ownership does not itself grant a direct combat modifier.

## Movement And Domains

- Land units care about land access, mountains, tunnels, bridges, and legal staging.
- Sea units can only enter water.
- Air units move freely across terrain but still care about legal landing sites and end-of-turn recovery.
- Movement is orthogonal only. The game uses four directions, not diagonals.

### Terrain Rules

- Land normally costs `1` move.
- Mountains normally cost `2` move for land units.
- Tanks cannot enter raw mountain tiles at all.
- Bridges let land units cross water crossings at normal movement cost.
- Tunnels let land units cross mountain tiles at normal movement cost.
- Special Ops may cross up to `2` water tiles when the route starts and ends on a legal insertion or extraction point.

### Occupancy Rules

- Land and sea share the surface occupancy layer. Air uses a separate air layer.
- Friendly surface units normally cannot stack on the same tile.
- Owned cities are the exception: they can hold up to `2` friendly surface units as a garrison stack.
- Air units can share a tile only when that tile has spare air capacity.
- Legal start and end states matter as much as path cost. A route is only valid if the unit can actually exist on both ends of it.

## Fortification And Entrenchment

- Units that do not spend their turn moving fortify at turn end.
- Sentry units also fortify and consume the turn while remaining in place.
- Fortified defenders reduce incoming damage unless the attacker ignores fortification.
- Choppers are a major exception because they ignore fortification.
- Concealment for submarines and stationary Special Ops is also refreshed through this same end-of-turn stationary logic.

### Infantry Entrenchment

- Infantry can entrench when they do not move.
- Entrenchment persists until the unit moves.
- Entrenchment reduces incoming damage more than standard fortification.
- Entrenchment also improves defensive counterattack value.

## Strategic Sites And Capture

- Cities, ports, airfields, and forward bases resist capture through a site-defense check.
- Adjacent friendly units add support to that site, up to `4` support points.
- Cities and ports get a base defense bonus of `2`.
- Airfields get a base defense bonus of `2`, or `4` if the airfield has radar.
- Attacker piercing reduces that site-defense value.
- Units that cannot capture cannot occupy enemy-owned strategic sites even if they win a fight on that tile.
- Capturing a city or enemy-owned improvement clears any production queued there.

### Outposts

- Outposts are not captured like normal sites.
- Outposts have structure HP and armor.
- Attacks against an enemy outpost deal structure damage until the outpost is destroyed.

### Forward Bases

- A forward base requires an engineer and infantry to establish.
- A forward base must maintain at least one infantry garrison.
- If a forward base is left empty, it is abandoned.

## Combat

- Combat damage is partly stat-based and partly randomized.
- Fortification and armor matter, but piercing reduces armor value.
- Defenders can retaliate if they are allowed to attack the attacker back.
- Anti-air bonuses apply when attacking or retaliating against air units.
- Combat should remain readable.

### Important Combat Exceptions

- Destroyers grant troop transports an armor bonus when within escort range `2`.
- Drone swarms self-destruct when they attack.
- Bombers can attack surface targets without automatically consuming all remaining movement.
- Special Ops can make a second combat pass in the same attack if they still had movement left after entering the fight.

## Fog Of War And Detection

- Standard visibility reveals tiles.
- Detection determines whether enemy units on those tiles are legally exposed and targetable.
- Cities, ports, airfields, and outposts provide static vision around themselves when friendly.
- Airfields with radar detect enemy air units in radar range.
- Carriers also provide long-range air detection.

### Stealth Rules

- Special Ops conceal while stationary.
- Submarines conceal while stationary.
- Concealed enemy units are not automatically revealed just because their tile is visible.

### Detection Counters

- Only infantry, scouts, engineers, and other Special Ops detect concealed Special Ops by default.
- Tanks are intentionally excluded from this role.
- Submarines are detected by ASW / sonar destroyers.
- Radar detects air only. It does not reveal Special Ops, submarines, or minefields.
- Recently attacking submarines generate a temporary detection event that preserves a reaction window after the submarine relocates.

### Minefield Detection

- Enemy minefields are hidden until the tile is visible and a friendly engineer is within engineer vision range.
- If a non-engineer land unit enters an enemy minefield, the minefield triggers, deals `7` damage, and is removed.
- Engineers entering an enemy minefield disarm it instead of taking damage.

## Production

- Land units are produced from owned cities.
- Sea units are produced from owned ports or owned coastal cities.
- Air units are produced from owned airfields.
- Production queues are single-slot per site.
- A garrisoned city can still queue and complete land production as long as its `2`-unit surface city stack is not already full.

## Engineers, Repairs, And Improvements

Engineers can build or affect:
- ports
- airfields
- bridges
- tunnels
- radar
- outposts
- minefields
- forward bases

### Project Rules

- Engineers can only start projects on adjacent legal tiles.
- Starting a project spends the engineer's turn immediately.
- An engineer assigned to a project is effectively pinned to it. If the engineer leaves the assigned origin tile, the project is canceled.
- Radar is not a standalone site. It upgrades an existing friendly airfield.

### Repairs

- Engineers provide adjacent repair support at end of turn.

### Improvement Costs And Time

- Bridge: cost `0`, build time `1`
- Port: cost `8`, build time `3`
- Airfield: cost `10`, build time `3`
- Radar upgrade: cost `6`, build time `3`
- Tunnel: cost `0`, build time `2`
- Outpost: cost `2`, build time `3`
- Minefield: cost `4`, build time `2`

## Air System

Air power exists to provide speed, reach, and precision.

Air units do:
- reposition quickly
- exploit exposed targets
- punish weak logistics
- reinforce distant sectors

Air units do not:
- hold territory
- sustain operations without bases
- survive prolonged exposure

### Air Constraints

- Air units must land on a valid base.
- Air units are vulnerable to AA.
- Air units cannot capture or hold territory.

### Fighters

- Role: air superiority
- Strong versus air
- Weak versus ground

### Heavy Aircraft

Heavy aircraft are loadout-based rather than permanently single-role.

#### Heavy Aircraft Loadouts

- Bomber
- Transport
- Drop Ops

#### Heavy Aircraft Loadout Rules

- Loadout changes happen only at an airfield.
- The first loadout is free.
- Changing loadout costs `1` full turn.
- The unit is renamed based on the active loadout.

### Choppers

Choppers are also loadout-based support aircraft.

#### Chopper Loadouts

- Transport
- Tank Killer
- Spec Ops Support

#### Chopper Loadout Rules

- Loadout changes happen at base only.
- Refit takes `1` turn.

### Air Network Capacity

- Each owned city grants `2` aircraft support capacity to that side's air network.
- Aircraft may be concentrated at one airfield if the player wants, but total based aircraft may not exceed `2 x owned cities`.
- Concentrating aircraft at one field still carries concentration risk if that field is struck.

### Endurance And Rearm

- Fighters and choppers have `maxTurnsAwayFromBase: 2`.
- Bombers also have `maxTurnsAwayFromBase: 2`.
- Bombers track bomb ammunition separately and start with `6` bombs.
- Bombers rearm when on a friendly legal base during turn processing.

## Anti-Air System

### Static AA

Static AA can exist at:
- cities
- airfields
- forward bases

#### Static AA Rules

- Static AA is built via upgrade.
- Static AA has HP and can be destroyed.
- Static AA automatically attacks enemy air in range.

#### Static AA Detection

- Static AA has a short base detection range.
- Static AA gains extended coverage if radar is present nearby.

### Mobile AA

#### Infantry Light AA

- Minimal AA capability
- Defensive only
- Triggers when attacked or when hostile air is adjacent

#### Armored AA

- Implemented as an APC-style variant
- Moderate AA capability
- Mobile

### Naval AA

- Destroyers and carriers provide anti-air coverage.
- Ships act as mobile AA zones.

## Naval System

### Ports And Naval Capacity

- Each owned coastal city counts as a port.
- Constructed port improvements are still allowed where legal, but the total number of port sites a side controls may never exceed its number of owned cities.
- Each port site has its own homeport identity for submarine assignment and replacement.

### Troop Transports

- Troop transports cannot attack.
- Transport capacity is `3`.
- Infantry, engineers, and Special Ops each use `1` capacity.
- Tanks use `3` capacity.

### Escort Rules

- A destroyer within range `2` of a troop transport grants that transport `+2` armor.

### Destroyer Configurations

- A destroyer must be configured at a port.
- The first configuration is free.
- Changing configuration takes `1` turn at a valid port.

#### AA / Radar Destroyer

- Stronger anti-air role
- Detects and contributes to fleet air control
- Does not detect submarines

#### ASW / Sonar Destroyer

- Detects submarines
- Gains stronger attack performance specifically against submarines
- Has weaker anti-air coverage than the AA / Radar destroyer

### Submarine Classes

#### SSN

- Fast attack submarine
- Uses torpedoes as its main weapon
- Carries multiple torpedoes
- Carries `1` cruise missile
- Can deploy Special Ops to coastal tiles

#### SSBN

- Missile-heavy boomer
- Carries many cruise missiles
- Carries only `1` torpedo, intended mainly as a defensive snapshot
- Lower mobility than SSN

### Submarine Rules

#### Attack Behavior

- After attacking, a submarine must move.
- A submarine cannot remain in the same tile after an attack.
- Submarines are hard to find but fragile once positively located.

#### Detection And Reaction Window

- Attacking creates a temporary detection event.
- The reaction window lasts `1` turn and points defenders toward the submarine's new area after relocation.

### SSBN Deep Silent Rule

After missile launch:
1. The SSBN must move.
2. It enters Deep Silent for `2` turns.
3. While in Deep Silent:
   - it cannot attack
   - it is extremely hard to detect

### Spec Ops Deployment From SSN

- SSN can deploy Special Ops to an adjacent land tile.
- After deployment, the SSN must remain stationary on the next turn.
- While stationary, the SSN is very difficult to detect.
- If an enemy submarine enters the same tile, the SSN is detected.

### Cruise Missiles

- Cruise missiles target land only.
- Cruise missiles require a visible or recently detected target.
- If the target is missing, the missile may redirect to an adjacent tile.
- If no valid target exists, the missile misses.

### Submarine Homeport Limits

- Each port may support at most `1` SSN and `1` SSBN at a time.
- If a side wants a second SSN, it needs another valid port homeport.
- Existing submarines remain in play if later losses reduce replacement capacity, but replacements are blocked until capacity exists again.

## Special Ops And Drones

### Special Ops

- Special Ops are an infiltration, recon-support, and capture-support unit.
- Special Ops can capture.
- Special Ops conceal while stationary.
- Base Special Ops vision is `3`.
- Special Ops can call an air strike against visible hostile units within range `3` if they still have movement remaining.
- Special Ops can be loaded into submarines or choppers.

#### Special Ops Movement Update

- Special Ops may cross up to `2` water tiles.
- Water-crossing movement must start and end on:
  - land
  - submarine
  - ship
  - chopper

#### Special Ops Production Limit

- A side may not produce more Special Ops units than the number of cities it currently owns.
- If city count later drops below the number of already-fielded Special Ops units, those units remain in play.
- No additional Special Ops may be produced until city count once again meets or exceeds the current Special Ops total.

### Drone Swarms

- Drone swarms do not move like normal player units. They are assigned a strike square.
- When drone orders resolve, they attack the assigned target tile.
- Drone strikes have a `10%` chance to scatter to a random adjacent tile.
- Drone swarms self-destruct during the strike.
- Carriers can jam nearby enemy drone swarms.

## Ground System

### Infantry

- Infantry captures territory.
- Infantry can entrench.
- Infantry is the backbone of holding ground and protecting support assets.

### Tanks

- Tanks are breakthrough units.
- Tanks are strongest against exposed targets.

### Artillery

- Artillery attacks at range `2` to `3`.
- Artillery cannot attack adjacent targets.
- Artillery cannot defend itself effectively.

### Engineers

- Engineers build improvements.
- Engineers provide adjacent repair at end of turn.

### Unit Rebalancing At Bases

- Rebalancing can happen at cities and forward bases.
- Only the same unit types may rebalance with each other.
- Total HP is conserved.
- Each resulting unit must retain at least `1` HP.

## Combined Arms

- Tanks want engineers and infantry.
- Bombers want forward airfields, radar, and scouting.
- Transports want destroyers.
- Special Ops want insertion and reconnaissance support.
- Carriers want escorts and aircraft that can exploit their mobility.
- Artillery wants screened ground and spotting support.
- Forward bases want infantry garrisons and engineer access.
- AA wants radar and proper placement.
- Submarines want gaps in enemy escort coverage.
- Destroyers want the right configuration for the threat they are screening against.

## Final Notes

- Air cannot win alone.
- Naval cannot hold territory.
- Land wins the game.
- Combined arms is required for success.
