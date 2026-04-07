# Game Rules

This document explains the implemented ruleset at a system level. It is written for developers first, but it should stay readable enough that designers and future contributors can use it to understand the real game behavior, including the mechanical edge cases that materially affect play.

If this document disagrees with the actual behavior in `lib/empire/game.ts`, the code wins until the mismatch is resolved.

## Core Loop

Each turn is about converting position into production, and production into control.

The normal flow is:

1. Reveal information with scouts, spies, radar, fleets, and air units.
2. Move units to improve position, attack, reinforce, or stage future attacks.
3. Queue production and start engineer projects where the map supports them.
4. End the turn. Stationary units fortify, income is paid, projects and production advance, and delayed systems resolve.
5. Repeat until one side has no cities and no units left.

The game rewards system pressure more than isolated duels. Capturing or disabling a key city, port, or airfield usually matters more than trading evenly on a random front.

## Win And Loss

- A side only loses when it has both zero cities and zero units remaining.
- Losing all cities is not by itself defeat if units still survive.
- Losing all units is not by itself defeat if at least one city still survives.
- Capturing cities matters because cities are both economy and production nodes, but elimination is not complete until the side has no surviving field presence either.

## Turn Structure

The implementation is asymmetrical in timing but not in outcome.

- The player gains income at the end of the player turn.
- The AI gains income at the beginning of the AI turn.
- On turn handoff, stationary units fortify, improvement projects advance, production queues advance, drone orders resolve, and airbase recovery logic runs.
- Production and projects do not resolve instantly when queued. They tick down on turn transition.

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

This makes reconnaissance economically valuable and tactically actionable at the same time.

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
- Spies are a special case: they can cross water, and water costs their full move allowance for the step.

### Occupancy Rules

- Land and sea share the surface occupancy layer. Air uses a separate air layer.
- Friendly surface units cannot stack on the same tile.
- Air units can share a tile only when that tile has spare air capacity.

## Fortification

- Units that do not spend their turn moving fortify at turn end.
- Sentry units also fortify and consume the turn while remaining in place.
- Fortified defenders reduce incoming damage unless the attacker ignores fortification.
- Choppers are a major exception because they ignore fortification.
- Concealment for spies, submarines, and stationary Special Ops is also refreshed through this same end-of-turn stationary logic.

Fortification exists to reward planning, defensive posture, and map preparation.

## Strategic Sites And Capture

Cities and certain improvements have their own site-defense rules beyond normal unit combat.

- Cities, ports, and airfields resist capture through a site-defense check.
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

## Combat

- Combat damage is partly stat-based and partly randomized.
- Fortification and armor matter, but piercing reduces armor value.
- Defenders can retaliate if they are allowed to attack the attacker back.
- Anti-air bonuses apply when attacking or retaliating against air units.

### Important Combat Exceptions

- A submarine attacking a carrier destroys the carrier outright.
- Destroyers grant troop transports an armor bonus when within escort range `2`.
- Drone swarms self-destruct when they attack.
- Bombers can attack surface targets without automatically consuming all remaining movement.
- Special Ops can make a second combat pass in the same attack if they still had movement left after entering the fight.
- Hidden spy-versus-spy contact is resolved specially: two spies eliminate each other if they cross paths while concealed.

## Fog Of War And Detection

Vision is not the same as detection.

- Standard visibility reveals tiles.
- Detection determines whether enemy units on those tiles are legally exposed and targetable.
- Cities, ports, airfields, and outposts provide static vision around themselves when friendly.
- Airfields with radar detect enemy air units in radar range.
- Carriers also provide long-range air detection.

### Stealth Rules

- Spies conceal while stationary.
- Special Ops conceal while stationary.
- Submarines conceal while stationary.
- Concealed enemy units are not automatically revealed just because their tile is visible.

### Detection Counters

- Most units cannot detect spies or concealed Special Ops unless their unit definition allows it.
- Submarines are only detected by sonar-upgraded destroyers.
- Radar detects air only. It does not reveal spies, Special Ops, submarines, or minefields.
- Engineers are the key minefield counter.

### Minefield Detection

- Enemy minefields are hidden until the tile is visible and a friendly engineer is within engineer vision range.
- Hidden enemy minefield construction projects are also suppressed from intel until detected.
- If a non-engineer land unit enters an enemy minefield, the minefield triggers, deals `7` damage, and is removed.
- Engineers entering an enemy minefield disarm it instead of taking damage.

This system is meant to make intelligence a force multiplier rather than decorative UI information.

## Logistics And Basing

The game treats logistics as gameplay, not bookkeeping.

- Cities, ports, airfields, and carriers form the production and basing web.
- Air power depends on legal landing sites and rearm opportunities.
- Naval invasions depend on transport capacity and escort support.
- Engineers matter because they expand the map of legal operations.

If a force cannot sustain itself after the first action, it is overextended even if it looked powerful on the previous turn.

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

## Engineers And Improvements

Engineers are one of the most important strategic units because they convert map shape into player choice.

They can build or affect systems such as:

- ports
- airfields
- bridges
- tunnels
- radar
- outposts
- minefields

The point of the engineer is not raw combat efficiency. The point is to create routes, staging, traps, and forward pressure that other units can exploit.

### Project Rules

- Engineers can only start projects on adjacent legal tiles.
- Starting a project spends the engineer's turn immediately.
- An engineer assigned to a project is effectively pinned to it. If the engineer leaves the assigned origin tile, the project is canceled.
- Decommissioning an engineer also cancels any project linked to that engineer.
- Radar is not a standalone site. It upgrades an existing friendly airfield.

### Improvement Costs And Time

- Bridge: cost `0`, build time `1`
- Port: cost `8`, build time `3`
- Airfield: cost `10`, build time `3`
- Radar upgrade: cost `6`, build time `3`
- Tunnel: cost `0`, build time `2`
- Outpost: cost `2`, build time `3`
- Minefield: cost `4`, build time `2`

## Naval Model

The navy is designed around formations rather than isolated ship strength.

- Troop transports are logistics assets, not combat ships.
- Destroyers screen transports and carriers and provide survivability benefits.
- Submarines threaten expensive hulls and sea lanes through concealment.
- Carriers project air power and information forward, but become priority targets when left unscreened.

### Troop Transports

- Troop transports cannot attack.
- Transport capacity is `3`.
- Infantry, engineers, spies, and Special Ops each use `1` capacity.
- Tanks use `3` capacity.
- Troops can only embark if they are adjacent to the transport, still have movement left, and are standing on a friendly port site.
- Friendly port sites include owned ports and owned coastal cities.
- Troops unload only to adjacent land tiles.
- Unloaded troops arrive with their move already spent for that turn.
- Cargo unloads FIFO because the implementation always unloads the first stored troop entry.

### Escort Rules

- A destroyer within range `2` of a troop transport grants that transport `+2` armor.
- This is a passive survivability modifier, not an activated ability.

### Submarines

- Submarines can only attack sea targets.
- Submarines can attack other submarines.
- Submarines are sonar-only detection targets.
- A submarine ambush on a carrier is lethal regardless of remaining carrier HP.

## Air Model

Air power is strong, but deliberately constrained.

- Fighters control the air and defend fleets or bases.
- Bombers punish surface targets and infrastructure.
- Choppers support flexible strike and insertion play.
- Drone swarms create pressure through expendable threat projection.

Air units are balanced around basing, recovery, and information. Without the right support network, they become inefficient very quickly.

### Air Capacity And Landing

- Normal friendly air bases have capacity `1`.
- Carriers have capacity `4`.
- Fighters, choppers, and drone swarms can land on carriers.
- Bombers cannot land on carriers. They can only land on airfields.
- Cities can host aircraft only when the aircraft's landing rules allow cities.
- Air stacking is therefore limited by capacity, not by a general unlimited-air rule.

### Endurance And Rearm

- Fighters and choppers have `maxTurnsAwayFromBase: 2`.
- Bombers also have `maxTurnsAwayFromBase: 2`.
- Bombers track bomb ammunition separately and start with `6` bombs.
- Bombers rearm when on a friendly legal base during turn processing.
- The current implementation resets air-unit away-from-base state only when on a legal base; it does not currently destroy aircraft automatically for exceeding endurance, so endurance acts more like a tracked support requirement than a crash timer.

### Radar And Carrier Air Support

- Radar on an airfield detects enemy air in range `5`.
- Carriers detect enemy air in range `5`.
- Carriers can be upgraded with radar relay, which lets friendly units attack detected enemies through the carrier relay network.
- Carriers can jam enemy drone swarms within range `2`, dealing up to `5` damage.

## Special Ops, Spies, And Drones

These units are rule-heavy enough that they need explicit treatment.

### Spies

- Spies cannot capture.
- Spies cannot attack.
- Spies conceal while stationary.
- Spies gain extended vision after their side's turn cycle refreshes them, raising spy vision from `3` to `5`.
- Spies can cross water unusually, but doing so costs a full movement step.

### Special Ops

- Special Ops can capture.
- Special Ops conceal while stationary.
- Special Ops can call an air strike against visible hostile units within range `3` if they still have movement remaining.
- Special Ops can be loaded into submarines or choppers.
- Submarine insertion places Special Ops onto adjacent land and keeps them concealed on deployment.
- Choppers can extract Special Ops from anywhere on the map in the current implementation; they do not require adjacent loading.

### Drone Swarms

- Drone swarms do not move like normal player units. They are assigned a strike square.
- When drone orders resolve, they attack the assigned target tile.
- Drone strikes have a `10%` chance to scatter to a random adjacent tile.
- Drone swarms self-destruct during the strike.
- Carriers can jam nearby enemy drone swarms.
- Drone swarms are hard to ignore, but they are also disposable by design.

## Decommissioning

- Units can be decommissioned for a refund equal to half their cost, rounded down.
- Decommissioning an engineer also cancels any active project assigned to that engineer.
- Decommissioning is therefore a real economic action, not just cleanup.

## Combined Arms

The rules are built to discourage single-unit solutions.

- Tanks want engineers and infantry.
- Bombers want forward airfields, radar, and scouting.
- Transports want destroyers.
- Special Ops want insertion and reconnaissance support.
- Carriers want escorts and aircraft that can exploit their mobility.

This is a foundational design rule for future balance work. New mechanics should generally deepen combined-arms play, not bypass it.

## Developer Notes

When changing the rules, document the answer to these questions:

1. What problem is the rule solving?
2. Which existing counterplay does it strengthen or weaken?
3. Does it increase or reduce the value of recon, logistics, or positioning?
4. Does it create a dominant one-unit strategy?

If the answer to the last question is yes, the change probably needs another pass.
