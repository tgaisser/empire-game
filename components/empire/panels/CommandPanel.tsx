'use client';

import { Castle, Compass, Shield, Wrench } from "lucide-react";
import { getFactionUnitBadgeClass, getFactionUnitBadgeStyle, getFactionUnitIconClass } from "@/components/empire/shared/domainStyles";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { UNIT_TYPE_ORDER } from "@/lib/empire/catalog";
import { getFactionOption, getSideDisplayOption } from "@/lib/empire/factions";
import { getImprovementBuildCost, getTroopTransportRemainingCapacity, getUnitStats } from "@/lib/empire/game";
import type { Faction, Side, Tile, TileImprovementType, Unit, UnitDefinition, UnitType } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type EngineerBuildAction = {
  improvementType: TileImprovementType;
  x: number;
  y: number;
  label: string;
};

type CommandPanelProps = {
  map: Tile[][];
  playerVisible: boolean[][];
  playerIntel: (Tile | null)[][];
  units: Unit[];
  viewport: { left: number; top: number; width: number; height: number };
  onMiniMapJump: (target: { x: number; y: number }) => void;
  selectedUnit: Unit | null;
  selectedUnitTile: Tile | null;
  selectedCity: Tile | null;
  selectedCityOccupants: { surface: Unit | null; air: Unit | null } | null;
  selectedSiteBuildableUnitTypes: Set<UnitType>;
  selectedSeaSpawnTileCount: number;
  playerCredits: number;
  playerCities: number;
  playerUnits: number;
  playerExploredPercent: number;
  unmovedUnitCount: number;
  playerFaction: Faction;
  aiFaction: Faction;
  side: Side;
  winner: Side | null;
  unitDefinitions: Record<UnitType, UnitDefinition>;
  engineerActions: EngineerBuildAction[];
  carrierJamTargetCount: number;
  carrierRelayAttackTargetCount: number;
  troopTransportLoadTargetCount: number;
  troopTransportDeploymentTargetCount: number;
  specialOpsDeploymentTargetCount: number;
  specialOpsAirStrikeTargetCount: number;
  canSelectedBomberAttackHere: boolean;
  transportLoadMode: boolean;
  onBuild: (unitType: UnitType) => void;
  onBuildImprovement: (action: EngineerBuildAction) => void;
  onUpgradeUnit: (upgrade: "sonar" | "radar-relay") => void;
  onBombsAway: () => void;
  onBeginTransportLoad: () => void;
  onLoadSpecialOps: () => void;
  onUnloadSpecialOps: () => void;
  onDecommissionUnit: () => void;
  canUndoLastMove: boolean;
  onUndoLastMove: () => void;
  onEndTurn: () => void;
  onShowUnmovedUnits: () => void;
};

export function CommandPanel({
  map,
  playerVisible,
  playerIntel,
  units,
  viewport,
  onMiniMapJump,
  selectedUnit,
  selectedUnitTile,
  selectedCity,
  selectedCityOccupants,
  selectedSiteBuildableUnitTypes,
  selectedSeaSpawnTileCount,
  playerCredits,
  playerCities,
  playerUnits,
  playerExploredPercent,
  unmovedUnitCount,
  playerFaction,
  aiFaction,
  side,
  winner,
  unitDefinitions,
  engineerActions,
  carrierJamTargetCount,
  carrierRelayAttackTargetCount,
  troopTransportLoadTargetCount,
  troopTransportDeploymentTargetCount,
  specialOpsDeploymentTargetCount,
  specialOpsAirStrikeTargetCount,
  canSelectedBomberAttackHere,
  transportLoadMode,
  onBuild,
  onBuildImprovement,
  onUpgradeUnit,
  onBombsAway,
  onBeginTransportLoad,
  onLoadSpecialOps,
  onUnloadSpecialOps,
  onDecommissionUnit,
  canUndoLastMove,
  onUndoLastMove,
  onEndTurn,
  onShowUnmovedUnits,
}: CommandPanelProps) {
  const mode = selectedCity ? "city" : selectedUnit ? "unit" : "overview";
  const selectedSiteOwner = selectedCity?.improvement?.owner ?? selectedCity?.improvementProject?.owner ?? selectedCity?.owner ?? null;

  return (
    <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          {mode === "city" ? <Castle className="w-5 h-5" /> : mode === "unit" ? <Shield className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
          Context Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <MiniMapPanel
            map={map}
            playerVisible={playerVisible}
            playerIntel={playerIntel}
            units={units}
            viewport={viewport}
            onJump={onMiniMapJump}
            selectedUnit={selectedUnit}
            selectedCity={selectedCity}
          />
          <div className="grid grid-cols-4 gap-2">
            <Button
              className="col-span-3 h-12 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-400"
              onClick={onEndTurn}
              disabled={side !== "player" || !!winner}
            >
              End Turn
            </Button>
            <Button
              variant="outline"
              className="col-span-1 h-12 rounded-2xl px-2 text-xs"
              onClick={onUndoLastMove}
              disabled={!canUndoLastMove}
            >
              Undo
            </Button>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
            {side === "player" && !winner && (
              <>
                <div>
                  <Button
                    variant="outline"
                    className="h-10 rounded-2xl border-amber-400/30 bg-amber-950/25 px-4 text-amber-100 hover:bg-amber-950/40 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/40 disabled:text-slate-500"
                    onClick={onShowUnmovedUnits}
                    disabled={unmovedUnitCount === 0}
                  >
                    Show {unmovedUnitCount} units without orders
                  </Button>
                </div>
              </>
            )}
            {side === "ai" && !winner && "Enemy turn in progress. Controls will unlock when command returns to you."}
            {winner && "The campaign is decided. Generate a new world when you want the next one."}
          </div>
        </div>

        <Separator className="bg-slate-800" />
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
          {mode === "overview" && side === "player" && !winner && "No unit or city selected. Pick a unit to move or a city to manage production."}
          {mode === "overview" && side === "ai" && !winner && "Enemy turn in progress. Review your current strategic position while the AI moves."}
          {winner === "player" && "You control the map. Generate a fresh world whenever you want another campaign."}
          {winner === "ai" && "The enemy controls the map. Regroup and start a new world when ready."}
        </div>

        {mode === "unit" && selectedUnit && (
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-base font-semibold text-slate-100">
                {selectedUnit.name ? `${selectedUnit.name} (${getUnitStats(selectedUnit).name})` : getUnitStats(selectedUnit).name}
              </div>
              <div className="mt-1">Position ({selectedUnit.x + 1}, {selectedUnit.y + 1})</div>
              <div className="mt-4 grid gap-2">
                {[
                  { label: "Hull", value: selectedUnit.hp, max: getUnitStats(selectedUnit).maxHp, tone: "from-emerald-300/70 to-emerald-500/20" },
                  { label: "Move", value: Math.max(0, getUnitStats(selectedUnit).move - selectedUnit.moveSpent), max: getUnitStats(selectedUnit).move, tone: "from-sky-300/70 to-sky-500/20" },
                  { label: "Attack", value: getUnitStats(selectedUnit).atk, max: Math.max(1, getUnitStats(selectedUnit).atk), tone: "from-red-300/70 to-red-500/20" },
                  { label: "Armor", value: getUnitStats(selectedUnit).armor, max: Math.max(1, getUnitStats(selectedUnit).armor), tone: "from-stone-300/70 to-stone-500/20" },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="mb-1 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-400">
                      <span>{bar.label}</span>
                      <span className="text-slate-200">{bar.value}/{bar.max}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${bar.tone}`}
                        style={{ width: `${Math.max(8, Math.round((bar.value / bar.max) * 100))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div>HP {selectedUnit.hp}</div>
                <div>Move {getUnitStats(selectedUnit).move}</div>
                <div>Attack {getUnitStats(selectedUnit).atk}</div>
                <div>Armor {getUnitStats(selectedUnit).armor}</div>
                <div>Piercing {getUnitStats(selectedUnit).piercing}</div>
                <div>Vision {getUnitStats(selectedUnit).vision}</div>
                <div>Move left {Math.max(0, getUnitStats(selectedUnit).move - selectedUnit.moveSpent)}</div>
                <div className="col-span-2">Domain {getUnitStats(selectedUnit).domain}</div>
                <div className="col-span-2">Tile improvement {selectedUnitTile?.improvement ? selectedUnitTile.improvement.type : "None"}</div>
                {selectedUnitTile?.improvementProject?.engineerUnitId === selectedUnit.id ? (
                  <div className="col-span-2">
                    Construction duty {selectedUnitTile.improvementProject.type} ({selectedUnitTile.improvementProject.turnsRemaining}/{selectedUnitTile.improvementProject.totalTurns})
                  </div>
                ) : null}
                {getUnitStats(selectedUnit).maxTurnsAwayFromBase && selectedUnit.turnsAwayFromBase > 0 ? (
                  <div className="col-span-2">
                    Sortie {selectedUnit.turnsAwayFromBase}/{getUnitStats(selectedUnit).maxTurnsAwayFromBase} turns away from base
                  </div>
                ) : null}
                {selectedUnit.type === "destroyer" ? (
                  <div className="col-span-2">Sonar {selectedUnit.sonarUpgraded ? "Installed" : "Not installed"}</div>
                ) : null}
                {selectedUnit.type === "carrier" ? (
                  <div className="col-span-2">Radar relay {selectedUnit.radarRelayUpgraded ? "Installed" : "Not installed"}</div>
                ) : null}
                {selectedUnit.type === "drone-swarm" ? (
                  <div className="col-span-2">
                    Strike square{" "}
                    {selectedUnit.droneTargetX !== null && selectedUnit.droneTargetX !== undefined && selectedUnit.droneTargetY !== null && selectedUnit.droneTargetY !== undefined
                      ? `(${selectedUnit.droneTargetX + 1}, ${selectedUnit.droneTargetY + 1})`
                      : "Awaiting assignment"}
                  </div>
                ) : null}
                {["apache", "submarine"].includes(selectedUnit.type) && selectedUnit.carriedSpecialOps ? (
                  <div className="col-span-2">Carrying Special Ops team</div>
                ) : null}
                {selectedUnit.type === "troop-transport" ? (
                  <div className="col-span-2">
                    Cargo {(selectedUnit.carriedTroops?.length ?? 0)} loaded, {getTroopTransportRemainingCapacity(selectedUnit)} capacity free
                  </div>
                ) : null}
                <div className="col-span-2">
                  Status{" "}
                  {selectedUnit.concealed
                    ? "Concealed"
                    : selectedUnit.fortified
                      ? "Fortified"
                      : selectedUnit.moveSpent >= getUnitStats(selectedUnit).move
                        ? "Spent"
                        : "Ready"}
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {selectedUnit.type === "destroyer" && !selectedUnit.sonarUpgraded ? (
                <Button variant="outline" className="w-full rounded-2xl" onClick={() => onUpgradeUnit("sonar")}>
                  Install Sonar Upgrade
                </Button>
              ) : null}
              {selectedUnit.type === "carrier" && !selectedUnit.radarRelayUpgraded ? (
                <Button variant="outline" className="w-full rounded-2xl" onClick={() => onUpgradeUnit("radar-relay")}>
                  Install Radar Relay
                </Button>
              ) : null}
              {selectedUnit.type === "carrier" && selectedUnit.radarRelayUpgraded ? (
                <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                  Fleet air defense active. Destroyers within carrier radar can engage aircraft across the carrier radar screen.
                  {carrierRelayAttackTargetCount > 0 ? ` ${carrierRelayAttackTargetCount} current relay target(s) available.` : ""}
                </div>
              ) : null}
              {selectedUnit.type === "carrier" ? (
                <div className="rounded-2xl border border-violet-800/40 bg-violet-950/20 p-3 text-xs text-violet-100">
                  Carrier jammer can disrupt drone swarms within 2 tiles.
                  {carrierJamTargetCount > 0 ? ` ${carrierJamTargetCount} jamming target(s) available.` : ""}
                </div>
              ) : null}
              {selectedUnit.type === "troop-transport" ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={onBeginTransportLoad}
                    disabled={side !== "player" || !!winner || troopTransportLoadTargetCount === 0}
                  >
                    {transportLoadMode ? "Select Troop To Load" : "Load Nearby Troops"}
                  </Button>
                  <div className="rounded-2xl border border-sky-800/40 bg-sky-950/20 p-3 text-xs text-sky-100">
                    Use the load command, then click a highlighted adjacent coastal troop to embark it. Click a highlighted adjacent shore tile to unload the next carried unit.
                    {transportLoadMode ? " Loading mode is active." : ""}
                    {troopTransportLoadTargetCount > 0 ? ` ${troopTransportLoadTargetCount} embark target(s) available.` : ""}
                    {troopTransportDeploymentTargetCount > 0 ? ` ${troopTransportDeploymentTargetCount} landing tile(s) available.` : ""}
                    {(selectedUnit.carriedTroops?.length ?? 0) > 0 ? " Escorting destroyers within 2 tiles improve this ship's defense." : ""}
                  </div>
                </>
              ) : null}
              {selectedUnit.type === "bomber" ? (
                <>
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl"
                    onClick={onBombsAway}
                    disabled={side !== "player" || !!winner || !canSelectedBomberAttackHere}
                  >
                    Bombs Away
                  </Button>
                  <div className="rounded-2xl border border-rose-800/40 bg-rose-950/20 p-3 text-xs text-rose-100">
                    When a bomber shares a square with an enemy ground or naval target, use Bombs Away to spend the turn on the strike.
                    {canSelectedBomberAttackHere ? " Target is directly below this bomber." : " No valid target is directly below this bomber."}
                  </div>
                </>
              ) : null}
              {["apache", "submarine"].includes(selectedUnit.type) && !selectedUnit.carriedSpecialOps ? (
                <Button variant="outline" className="w-full rounded-2xl" onClick={onLoadSpecialOps}>
                  {selectedUnit.type === "submarine" ? "Embark Special Ops Team" : "Load Special Ops Team"}
                </Button>
              ) : null}
              {selectedUnit.type === "apache" && selectedUnit.carriedSpecialOps ? (
                <Button variant="outline" className="w-full rounded-2xl" onClick={onUnloadSpecialOps}>
                  Deploy Special Ops Team
                </Button>
              ) : null}
              {selectedUnit.type === "submarine" && selectedUnit.carriedSpecialOps ? (
                <>
                  <Button variant="outline" className="w-full rounded-2xl" onClick={onUnloadSpecialOps}>
                    Insert Special Ops To Shore
                  </Button>
                  <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                    Submarine insertion requires the boat to be one tile offshore. Click a highlighted adjacent beach tile to send the team ashore concealed.
                    {specialOpsDeploymentTargetCount > 0 ? ` ${specialOpsDeploymentTargetCount} landing tile(s) available.` : " No legal beach tile is available from this position."}
                  </div>
                </>
              ) : null}
              {selectedUnit.type === "special-ops" ? (
                <div className="rounded-2xl border border-amber-800/40 bg-amber-950/20 p-3 text-xs text-amber-100">
                  Click a visible enemy within 3 tiles to call in a deadly air strike.
                  {specialOpsAirStrikeTargetCount > 0 ? ` ${specialOpsAirStrikeTargetCount} target(s) currently available.` : ""}
                </div>
              ) : null}
              {selectedUnit.type === "drone-swarm" ? (
                <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                  Drone swarms need a strike square assigned the first time you select them. After that, they fly automatically toward it at the end of each of your turns and detonate on arrival.
                </div>
              ) : null}
            </div>
            <Button
              variant="outline"
              className="w-full rounded-2xl border-red-900/70 bg-red-950/20 text-red-100 hover:bg-red-950/35"
              disabled={side !== "player" || !!winner}
              onClick={onDecommissionUnit}
            >
              Decommission Unit
            </Button>
            {selectedUnit.type === "engineer" && (
              <>
                <Separator className="bg-slate-800" />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-slate-100">
                    <Wrench className="h-4 w-4" /> Field works
                  </div>
                  {engineerActions.filter((action) => action.improvementType !== "bridge").length > 0 ? (
                    <div className="grid gap-2">
                      {engineerActions
                        .filter((action) => action.improvementType !== "bridge")
                        .map((action) => {
                          const buildCost = getImprovementBuildCost(action.improvementType);
                          const canAfford = playerCredits >= buildCost;

                          return (
                            <Button
                              key={`${action.improvementType}-${action.x}-${action.y}`}
                              variant="outline"
                              className="justify-between rounded-2xl"
                              disabled={
                                side !== "player" ||
                                !!winner ||
                                getUnitStats(selectedUnit).move - selectedUnit.moveSpent <= 0 ||
                                !canAfford
                              }
                              onClick={() => onBuildImprovement(action)}
                            >
                              <span className="text-left">
                                <span className="block font-semibold">{action.label}</span>
                                <span className="block text-xs text-slate-400">
                                  Then click a highlighted tile next to the engineer.
                                  {buildCost > 0 ? ` Cost ${buildCost}.` : ""}
                                  {!canAfford ? " Not enough credits." : ""}
                                </span>
                              </span>
                              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-800 bg-slate-800/70">
                                <ImprovementIcon improvementType={action.improvementType} />
                              </span>
                            </Button>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
                      No valid engineering works from this position. Ports need land beside water, airfields and outposts need open land, radar needs an adjacent friendly airfield without radar, and tunnels need adjacent mountains.
                    </div>
                  )}
                  {engineerActions.some((action) => action.improvementType === "bridge") ? (
                    <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                      Valid build sites are marked on the map. Click a highlighted river tile for a bridge, or choose a highlighted land or mountain tile for other engineer works.
                    </div>
                  ) : null}
                  {selectedUnitTile?.improvementProject?.engineerUnitId === selectedUnit.id ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
                      This engineer is committed to the build site and cannot move until the project finishes.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        )}

        {mode === "city" && selectedCity && (
          <div className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-100">
                    {selectedCity.cityName ?? `City at (${selectedCity.x + 1}, ${selectedCity.y + 1})`}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span>
                      Owner:{" "}
                      {selectedSiteOwner === "player"
                        ? getFactionOption(playerFaction).label
                        : selectedSiteOwner === "ai"
                          ? getFactionOption(aiFaction).label
                          : "Neutral"}
                    </span>
                    <span>
                      Production:{" "}
                      {selectedCity.production
                        ? `${unitDefinitions[selectedCity.production.unitType].name} ${selectedCity.production.turnsRemaining}/${selectedCity.production.totalTurns}`
                        : "Idle"}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 text-right text-[11px] text-slate-400">
                  Grid ({selectedCity.x + 1}, {selectedCity.y + 1})
                </div>
              </div>
              <div className="mt-3 grid gap-x-4 gap-y-1 text-xs text-slate-400 sm:grid-cols-2">
                <div>
                  Air Units:{" "}
                  {selectedCityOccupants?.air
                    ? `${selectedCityOccupants.air.owner === "player" ? "Friendly" : "Enemy"} ${selectedCityOccupants.air.type}`
                    : "None"}
                </div>
                <div>
                  Surface Units:{" "}
                  {selectedCityOccupants?.surface
                    ? `${selectedCityOccupants.surface.owner === "player" ? "Friendly" : "Enemy"} ${selectedCityOccupants.surface.type}`
                    : "None"}
                </div>
                {selectedCity.improvement ? (
                  <div className="sm:col-span-2">
                    Improvement {selectedCity.improvement.type}
                    {selectedCity.improvement.type === "airfield" && selectedCity.improvement.hasRadar ? " with radar" : ""}
                  </div>
                ) : null}
                {selectedCity.improvementProject ? (
                  <div className="sm:col-span-2">
                    Construction {selectedCity.improvementProject.type} ({selectedCity.improvementProject.turnsRemaining}/{selectedCity.improvementProject.totalTurns})
                  </div>
                ) : null}
              </div>
            </div>
            <Separator className="bg-slate-800" />
            <div className="grid gap-3">
              {UNIT_TYPE_ORDER
                .filter((unitType) => selectedSiteBuildableUnitTypes.has(unitType))
                .map((unitType) => [unitType, unitDefinitions[unitType]] as [UnitType, UnitDefinition])
                .map(([unitType, unitDefinition]) => {
                const slotBlocked =
                  unitDefinition.domain === "air"
                    ? !!selectedCityOccupants?.air
                    : unitDefinition.domain === "land"
                      ? !!selectedCityOccupants?.surface
                      : false;
                const disabled =
                  !!selectedCity.production ||
                  playerCredits < unitDefinition.cost ||
                  selectedSiteOwner !== "player" ||
                  slotBlocked;
                const attackProfile = unitDefinition.attackDomains.length ? `${unitDefinition.attackDomains.join("/")} attack` : "Non-combat";

                return (
                  <Button
                    key={unitType}
                    variant="outline"
                    className="h-auto min-h-16 justify-between rounded-2xl px-4 py-3"
                    disabled={disabled}
                    onClick={() => onBuild(unitType)}
                  >
                    <span className="text-left">
                      <span className="block font-semibold">{unitDefinition.name}</span>
                      <span className="block text-xs text-slate-400">
                        Cost {unitDefinition.cost} • Build {unitDefinition.buildTime}t • {unitDefinition.domain}
                      </span>
                      <span className="block text-xs text-slate-400">
                        Move {unitDefinition.move} • Attack {unitDefinition.atk} • Armor {unitDefinition.armor} • Vision {unitDefinition.vision}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {unitDefinition.canCapture ? "Captures cities" : "Cannot capture"} • {attackProfile}
                      </span>
                      {unitDefinition.domain === "sea" && selectedSeaSpawnTileCount > 1 && (
                        <span className="block text-xs text-cyan-300">
                          You will choose which adjacent water tile receives deployment.
                        </span>
                      )}
                    </span>
                    <span
                      className={[
                        "flex h-8 w-8 items-center justify-center rounded-full border border-slate-900/20 shadow-sm",
                        getFactionUnitBadgeClass(unitType, unitDefinition.domain, playerFaction),
                      ].join(" ")}
                      style={getFactionUnitBadgeStyle(unitType, unitDefinition.domain, playerFaction)}
                    >
                      <UnitTypeIcon
                        unitType={unitType}
                        className={getFactionUnitIconClass(playerFaction)}
                      />
                    </span>
                  </Button>
                );
              })}
            </div>
            {!selectedCity.production && (selectedCityOccupants?.surface || selectedCityOccupants?.air) && (
              <div className="text-xs text-slate-400">
                This site has occupied deployment slots. Air builds need a clear air slot, land builds need a clear ground slot, and naval builds launch into adjacent water instead.
              </div>
            )}
            {!selectedCity.production && selectedSiteBuildableUnitTypes.size === 0 && (
              <div className="text-xs text-slate-400">
                This site cannot build any current unit types. Air units require an airfield, land units require a city, and naval units require a port or coastal city.
              </div>
            )}
            {selectedCity.production && (
              <div className="text-xs text-slate-400">
                This site is busy producing {unitDefinitions[selectedCity.production.unitType].name.toLowerCase()}{selectedCity.city ? " and the city earns no income until it finishes." : "."}
              </div>
            )}
          </div>
        )}

        {mode === "overview" && (
          <div className="space-y-3 text-sm text-slate-300">
            <div className="font-semibold text-slate-100">Strategic overview</div>
            <div className="grid gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>Credits {playerCredits}</div>
                  <div>Cities {playerCities}</div>
                  <div>Units {playerUnits}</div>
                  <div>Explored {playerExploredPercent}%</div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                Select a unit to inspect combat stats or select one of your cities to manage production.
              </div>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

function MiniMapPanel({
  map,
  playerVisible,
  playerIntel,
  units,
  viewport,
  onJump,
  selectedUnit,
  selectedCity,
}: {
  map: Tile[][];
  playerVisible: boolean[][];
  playerIntel: (Tile | null)[][];
  units: Unit[];
  viewport: { left: number; top: number; width: number; height: number };
  onJump: (target: { x: number; y: number }) => void;
  selectedUnit: Unit | null;
  selectedCity: Tile | null;
}) {
  const playerDisplay = getSideDisplayOption("player")!;
  const aiDisplay = getSideDisplayOption("ai")!;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Minimap</div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.16em] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: displaySwatch(playerDisplay) }} />
            You
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: displaySwatch(aiDisplay) }} />
            Enemy
          </span>
        </div>
      </div>
      <div
        className="relative grid gap-px overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 p-1"
        style={{ gridTemplateColumns: `repeat(${map[0]?.length ?? 1}, minmax(0, 1fr))` }}
      >
        {map.flat().map((tile) => {
          const visible = playerVisible[tile.y]?.[tile.x] ?? false;
          const intelTile = playerIntel[tile.y]?.[tile.x] ?? null;
          const occupant = units.find((unit) => unit.x === tile.x && unit.y === tile.y && (unit.owner === "player" || visible));
          const selected = (selectedUnit?.x === tile.x && selectedUnit?.y === tile.y) || (selectedCity?.x === tile.x && selectedCity?.y === tile.y);
          return (
            <button
              key={`minimap-${tile.x}-${tile.y}`}
              type="button"
              onClick={() => onJump({ x: tile.x, y: tile.y })}
              className={[
                "relative aspect-square min-h-0 rounded-[2px]",
                selected ? "ring-1 ring-amber-300 ring-offset-0" : "",
              ].join(" ")}
              style={{ backgroundColor: minimapTileColor(tile, intelTile, visible, playerDisplay, aiDisplay) }}
            >
              {occupant ? (
                <span
                      className="absolute inset-[22%] rounded-full border border-slate-950/60"
                  style={{ backgroundColor: occupant.owner === "player" ? displaySwatch(playerDisplay) : displaySwatch(aiDisplay) }}
                />
              ) : null}
            </button>
          );
        })}
        <div
          className="pointer-events-none absolute border border-white/90 shadow-[0_0_0_1px_rgba(15,23,42,0.65)]"
          style={{
            left: `${viewport.left * 100}%`,
            top: `${viewport.top * 100}%`,
            width: `${Math.min(100, viewport.width * 100)}%`,
            height: `${Math.min(100, viewport.height * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function minimapTileColor(
  tile: Tile,
  intelTile: Tile | null,
  visible: boolean,
  playerDisplay: NonNullable<ReturnType<typeof getSideDisplayOption>>,
  aiDisplay: NonNullable<ReturnType<typeof getSideDisplayOption>>
) {
  if (!visible && !intelTile) return "#020617";

  const sourceTile = visible ? tile : intelTile ?? tile;
  const fogDim = visible ? 0 : 0.68;

  if (sourceTile.owner === "player") return mixColor(displaySwatch(playerDisplay), "#0f172a", fogDim ? fogDim : 0.38);
  if (sourceTile.owner === "ai") return mixColor(displaySwatch(aiDisplay), "#0f172a", fogDim ? fogDim : 0.38);
  if (sourceTile.city) return mixColor("#cbd5e1", "#0f172a", fogDim);
  if (sourceTile.improvement?.type === "port") return mixColor("#0ea5e9", "#0f172a", fogDim);
  if (sourceTile.improvement?.type === "airfield") return mixColor("#f59e0b", "#0f172a", fogDim);
  if (sourceTile.terrain === "water") return mixColor("#1e3a5f", "#0f172a", fogDim);
  if (sourceTile.terrain === "mountain") return mixColor("#64748b", "#0f172a", fogDim);
  return mixColor("#5f6b43", "#0f172a", fogDim);
}

function displaySwatch(display: NonNullable<ReturnType<typeof getSideDisplayOption>>) {
  return display.hex;
}

function mixColor(hexA: string, hexB: string, amount: number) {
  const parseHex = (value: string) => value.replace("#", "").match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [0, 0, 0];
  const [ar, ag, ab] = parseHex(hexA);
  const [br, bg, bb] = parseHex(hexB);
  const mix = (a: number, b: number) => Math.round(a * (1 - amount) + b * amount);
  return `rgb(${mix(ar, br)} ${mix(ag, bg)} ${mix(ab, bb)})`;
}
