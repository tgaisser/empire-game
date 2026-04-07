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
4. End the turn. Stationary units fortify, income is paid, projects and production advance, and delayed systems resolve.
5. Repeat until one side has no cities and no units left.

The game rewards system pressure more than isolated duels. Capturing or disabling a key city, port, airfield, forward base, or logistics route usually matters more than trading evenly on a random front.

## Win And Loss

- A side only loses when it has both zero cities and zero units remaining.
- Losing all cities is not by itself defeat if units still survive.
- Losing all units is not by itself defeat if at least one city still survives.
- Capturing cities matters because cities are both economy and production nodes, but elimination is not complete until the side has no surviving field presence either.
- Air and naval power can shape the map, but land control is what closes the game out.

## Turn Structure

The implementation is asymmetrical in timing but not in outcome.

- The player gains income at the end of the player turn.
- The AI gains income at the beginning of the AI turn.
- On turn handoff, stationary units fortify, improvement projects advance, production queues advance, drone orders resolve, and airbase recovery logic runs.
- Production and projects do not resolve instantly when queued. They tick down on turn transition.
- End-of-turn effects are an important part of balance. Engineers, entrenchment, repairs, concealment refresh, and base-related behavior all live here conceptually even when they originate from different systems.

## Economy

- Cities are the main production and income nodes.
- A city only produces income when it is idle. A city that is currently building a unit does not generate its normal city income that turn.
- Base city income is `6` credits per idle city.
- Exploration also matters economically. Exploration income is `floor(explored map percent / 10)`.
- Unit cost is paid up front when production is queued, not when the unit spawns.
- Engineer projects also commit their cost up front when construction starts.

This means a player can be rich in territory and still cash-poor if too many cities are tied up in production or too much engineer work is underway.

## Exploration And Intel

- Exploration is tracked from each side's own intel map, not from the full real map.
- Explored percent is based on how many tiles have ever been revealed into that side's intel memory.
- Vision and detection are separate systems.
- A tile can be visible without every enemy unit on it being legally detected.
- Movement also reveals. Units reveal tiles along their movement path during the turn, not just from their final position.

### Last Known Position

- When an enemy unit is detected, the intel layer should preserve a last known position marker.
- Last known markers last `1` turn unless refreshed.
- This system exists to preserve clarity without granting perfect information.
- The player should know where the enemy was last positively identified, not where the enemy certainly is now.

This makes reconnaissance economically valuable and tactically actionable at the same time.

## Land Ownership

- Tiles have an owner state: player, enemy, or neutral.
- Ownership affects who may build on the tile.
- Ownership affects who may deploy from the tile.
- Ownership does not itself grant a direct combat modifier.
- Ownership is a control and logistics rule, not an invisible stat buff.

## Movement And Domains

The game is explicitly domain-based.

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
- Special Ops have normal land movement by default, but updated rules allow them to cross up to `2` water tiles when the route starts and ends on a legal insertion or extraction point.

### Occupancy Rules

- Land and sea share the surface occupancy layer. Air uses a separate air layer.
- Friendly surface units cannot stack on the same tile.
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
- Entrenchment reduces incoming damage.
- Entrenchment also improves defensive counterattack value.
- Entrenchment is meant to make infantry the backbone of positional warfare rather than just cheap capture tokens.

Fortification exists to reward planning, defensive posture, and map preparation.

## Strategic Sites And Capture

Cities and certain improvements have their own site-defense rules beyond normal unit combat.

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
- Destroying an outpost removes the improvement and clears ownership of that tile.

### Forward Bases

- Forward bases are staging sites rather than full cities.
- A forward base requires an engineer and infantry to establish.
- A forward base must maintain at least one infantry garrison.
- If a forward base is left empty, it is abandoned.
- Forward bases exist to create local reinforcement, staging, and operational depth without replacing cities.

## Combat

- Combat damage is partly stat-based and partly randomized.
- Fortification and armor matter, but piercing reduces armor value.
- Defenders can retaliate if they are allowed to attack the attacker back.
- Anti-air bonuses apply when attacking or retaliating against air units.
- Combat should remain readable. The system should prefer clear role expression over large stacks of obscure modifiers.

### Important Combat Exceptions

- A submarine attacking a carrier destroys the carrier outright.
- Destroyers grant troop transports an armor bonus when within escort range `2`.
- Drone swarms self-destruct when they attack.
- Bombers can attack surface targets without automatically consuming all remaining movement.
- Special Ops can make a second combat pass in the same attack if they still had movement left after entering the fight.
- Concealed Special Ops can still be exposed and eliminated when an enemy force enters their tile without proper detection support.

## Fog Of War And Detection

Vision is not the same as detection.

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
- Tanks are intentionally excluded from this role so they do not become all-purpose answers.
- Submarines are only detected by sonar-upgraded destroyers.
- Radar detects air only. It does not reveal Special Ops, submarines, or minefields.
- Engineers are the key minefield counter.
- Recently attacking submarines should generate a temporary detection event even if they are otherwise difficult to pin down.

### Minefield Detection

- Enemy minefields are hidden until the tile is visible and a friendly engineer is within engineer vision range.
- Hidden enemy minefield construction projects are also suppressed from intel until detected.
- If a non-engineer land unit enters an enemy minefield, the minefield triggers, deals `7` damage, and is removed.
- Engineers entering an enemy minefield disarm it instead of taking damage.

This system is meant to make intelligence a force multiplier rather than decorative UI information.

## Production

- Land units are produced from owned cities.
- Sea units are produced from owned ports or owned coastal cities.
- Air units are produced from owned airfields.
- Production queues are single-slot per site.
- A site cannot start a second unit while a production queue is active there.

### Spawn Rules

- Sea production needs a legal water deployment tile.
- A sea build can finish but remain blocked if its assigned deployment tile is occupied.
- Land and air production also require a legal unblocked spawn tile at completion.
- Completed-but-blocked production remains in place with `turnsRemaining` at `0` until the lane opens.

## Engineers, Repairs, And Improvements

Engineers are one of the most important strategic units because they convert map shape into player choice.

They can build or affect systems such as:

- ports
- airfields
- bridges
- tunnels
- radar
- outposts
- minefields
- forward bases

The point of the engineer is not raw combat efficiency. The point is to create routes, staging, traps, repair coverage, and forward pressure that other units can exploit.

### Project Rules

- Engineers can only start projects on adjacent legal tiles.
- Starting a project spends the engineer's turn immediately.
- An engineer assigned to a project is effectively pinned to it. If the engineer leaves the assigned origin tile, the project is canceled.
- Decommissioning an engineer also cancels any project linked to that engineer.
- Radar is not a standalone site. It upgrades an existing friendly airfield.

### Repairs

- Engineers provide adjacent repair support at end of turn.
- Repair is intended to reward maintaining formation integrity and preserving support units.
- Repair should favor nearby combined-arms groups over isolated spearheads.

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
- Air power should feel sharp and flexible, but never self-sufficient.

### Fighters

- Role: air superiority
- Strong versus air
- Weak versus ground
- Fighters are the cleanest answer to enemy aircraft, not a general-purpose strike platform.

### Heavy Aircraft

Heavy aircraft are loadout-based rather than permanently single-role.

#### Heavy Aircraft Loadouts

- Bomber: high damage versus land targets
- Transport: carries units with limited capacity
- Drop Ops: deploys units such as Special Ops or infantry

#### Heavy Aircraft Loadout Rules

- Loadout changes happen only at an airfield.
- The first loadout is free.
- Changing loadout costs `1` full turn.
- The unit is renamed based on the active loadout.

This keeps the chassis strategically flexible while preserving real operational commitment.

### Choppers

Choppers are also loadout-based support aircraft rather than pure attack pieces.

#### Chopper Loadouts

- Transport
- Tank Killer
- Spec Ops Support

#### Chopper Loadout Rules

- Loadout changes happen at base only.
- Refit takes `1` turn.

#### Chopper Behavior

- Fragile
- Short range
- Intended to support operations rather than dominate combat
- Best used to crack a narrow problem inside a larger combined-arms push

### Airfield Capacity

- Airfields have no hard unit cap under the updated rule set.
- The balancing pressure is not stacking prohibition but concentration risk.
- If an airfield is attacked successfully, all aircraft based there are at risk.
- This encourages dispersion, redundancy, and careful base placement.

### Endurance And Rearm

- Fighters and choppers have `maxTurnsAwayFromBase: 2`.
- Bombers also have `maxTurnsAwayFromBase: 2`.
- Bombers track bomb ammunition separately and start with `6` bombs.
- Bombers rearm when on a friendly legal base during turn processing.
- The current implementation resets air-unit away-from-base state only when on a legal base; it does not currently destroy aircraft automatically for exceeding endurance, so endurance acts more like a tracked support requirement than a crash timer.

## Anti-Air System

Anti-air exists to stop aircraft from becoming a default answer to every problem.

The AA model should be visible, understandable, and map-shaping.

### Static AA

Static AA can exist at:

- cities
- airfields
- forward bases

#### Static AA Rules

- Static AA is built via upgrade.
- Static AA has HP and can be destroyed.
- Static AA automatically attacks enemy air in range.
- Static AA should be a meaningful area-denial asset, not just flavor.

#### Static AA Detection

- Static AA has a short base detection range.
- Static AA gains extended coverage if radar is present nearby.

### Mobile AA

Mobile AA is the formation-level air-defense layer.

#### Infantry Light AA

- Minimal AA capability
- Defensive only
- Triggers when attacked or when hostile air is adjacent

This makes ordinary infantry slightly less helpless against air without turning them into true AA units.

#### Armored AA

- Implemented as an APC-style variant
- Moderate AA capability
- Mobile
- Intended to protect formations and advance with the ground force

### Naval AA

- Destroyers and carriers provide strong anti-air coverage.
- Ships act as mobile AA zones.
- Naval AA is one of the main reasons fleets should travel as groups instead of isolated hulls.

## Naval System

The navy is designed around formations, threat projection, and risk management rather than isolated ship strength.

### Troop Transports

- Troop transports cannot attack.
- Transport capacity is `3`.
- Infantry, engineers, and Special Ops each use `1` capacity.
- Tanks use `3` capacity.
- Troops can only embark if they are adjacent to the transport, still have movement left, and are standing on a friendly port site.
- Friendly port sites include owned ports and owned coastal cities.
- Troops unload only to adjacent land tiles.
- Unloaded troops arrive with their move already spent for that turn.
- Cargo unloads FIFO because the implementation always unloads the first stored troop entry.

### Escort Rules

- A destroyer within range `2` of a troop transport grants that transport `+2` armor.
- This is a passive survivability modifier, not an activated ability.

### Submarine Classes

The updated rules split submarines into clearer roles.

#### SSN

- Fast attack submarine
- Uses torpedoes
- Carries `1` cruise missile
- Can deploy Special Ops to coastal tiles

#### SSBN

- Missile-heavy boomer
- Carries multiple cruise missiles
- Lower mobility than SSN

### Submarine Rules

#### Attack Behavior

- After attacking, a submarine must move.
- A submarine cannot remain in the same tile after an attack.

#### Detection

- Attacking creates a temporary detection event.
- That detection event lasts `1` turn.
- Enemy forces should gain a brief but meaningful chance to react after a submarine reveals itself through violence.

### SSBN Deep Silent Rule

After missile launch:

1. The SSBN must move.
2. It enters Deep Silent for `2` turns.
3. While in Deep Silent:
   - it cannot attack
   - it is extremely hard to detect

This rule reinforces SSBN identity as a strategic threat rather than a repeated tactical skirmisher.

### Spec Ops Deployment From SSN

- SSN can deploy Special Ops to an adjacent land tile.
- After deployment, the SSN must remain stationary on the next turn.
- While stationary, the SSN is very difficult to detect.
- If an enemy submarine enters the same tile, the SSN is detected.

### Cruise Missiles

- Cruise missiles target land only.
- Cruise missiles require a visible or recently detected target.
- Missile resolution happens the same turn or the next depending on the firing model.
- If the target is missing, the missile may redirect to an adjacent tile.
- If no valid target exists, the missile misses.

Cruise missiles should reward intel preparation, not blind firing.

## Special Ops And Drones

These units are rule-heavy enough that they need explicit treatment.

### Special Ops

- Special Ops are an infiltration, recon-support, and capture-support unit.
- Special Ops can capture.
- Special Ops conceal while stationary.
- Special Ops now occupy the game's stealth recon role after the removal of spies.
- Base Special Ops vision is `3`.
- Special Ops can call an air strike against visible hostile units within range `3` if they still have movement remaining.
- Special Ops can be loaded into submarines or choppers.
- Submarine insertion places Special Ops onto adjacent land and keeps them concealed on deployment.
- Choppers can extract Special Ops from anywhere on the map in the current implementation; they do not require adjacent loading.

#### Special Ops Movement Update

- Special Ops use normal land movement as a base rule.
- Special Ops may cross up to `2` water tiles.
- Water-crossing movement must start and end on one of the following:
  - land
  - submarine
  - ship
  - chopper

This makes them excellent at infiltration without turning them into general amphibious assault troops.

### Drone Swarms

- Drone swarms do not move like normal player units. They are assigned a strike square.
- When drone orders resolve, they attack the assigned target tile.
- Drone strikes have a `10%` chance to scatter to a random adjacent tile.
- Drone swarms self-destruct during the strike.
- Carriers can jam nearby enemy drone swarms.
- Drone swarms are hard to ignore, but they are also disposable by design.

## Ground System

Ground forces decide the war because they are the only layer that can reliably occupy, defend, and convert map control into victory.

### Infantry

- Infantry captures territory.
- Infantry can entrench.
- Infantry is the backbone of holding ground and protecting support assets.

### Tanks

- Tanks are breakthrough units.
- Tanks are strongest against exposed targets.
- Tanks should be feared in open routes and frustrated by bad terrain, mines, and unsupported overextension.

### Artillery

- Artillery attacks at range `2` to `3`.
- Artillery cannot attack adjacent targets.
- Artillery cannot defend itself effectively.
- Artillery exists to force enemy movement and break entrenched positions.

Artillery should shape ground tempo rather than act as a direct brawler.

### Engineers

- Engineers build improvements.
- Engineers provide adjacent repair at end of turn.
- Engineers are required to create the operational geometry that tanks, artillery, and airpower exploit.

### Unit Rebalancing At Bases

Unit rebalancing is a sustainment mechanic intended to reduce awkward HP fragmentation.

- Rebalancing can happen at cities and forward bases.
- Only the same unit types may rebalance with each other.
- Total HP is conserved.
- Each resulting unit must retain at least `1` HP.

This is a logistics-quality rule, not a free-heal rule.

## Air, Naval, And Land Balance Summary

### Air

- Fast
- Flexible
- Precision-oriented
- Vulnerable
- Base-dependent

Air should feel powerful when supported and brittle when overextended.

### Naval

- Strong
- Risk-based
- Intel-dependent
- Position-dependent

Naval power should feel dominant in the right corridor and uncertain in the wrong one.

### Land

- Wins the game
- Provides stable positional play
- Controls territory
- Converts operational success into actual victory

Land is the final authority on map ownership.

## Combined Arms

The rules are built to discourage single-unit solutions.

- Tanks want engineers and infantry.
- Bombers want forward airfields, radar, and scouting.
- Transports want destroyers.
- Special Ops want insertion and reconnaissance support.
- Carriers want escorts and aircraft that can exploit their mobility.
- Artillery wants screened ground and spotting support.
- Forward bases want infantry garrisons and engineer access.
- AA wants radar and proper placement.

Combined arms is not a flavor target. It is the balance foundation.

## Final Notes

- Air cannot win alone.
- Naval cannot hold territory.
- Land wins the game.
- Combined arms is required for success.

Any future rules work should preserve those truths. New units and mechanics should deepen system identity, not blur it.

## Developer Notes

When changing the rules, document the answer to these questions:

1. What problem is the rule solving?
2. Which existing counterplay does it strengthen or weaken?
3. Does it increase or reduce the value of recon, logistics, or positioning?
4. Does it create a dominant one-unit strategy?

If the answer to the last question is yes, the change probably needs another pass.
