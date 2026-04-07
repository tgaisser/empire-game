'use client';

import { Bug, X } from "lucide-react";
import { getImprovementTypeLabel, getUnitTypeLabel, UNIT_TYPE_ORDER } from "@/lib/empire/catalog";
import type { AiDiagnosticsReport } from "@/lib/empire/ai/diagnostics";
import type { AiTurnPlan } from "@/lib/empire/ai/planner";
import type { AiDebugTacticalPreview } from "@/components/empire/hooks/useEmpireGame";
import type { DeveloperPlacementType, Side, UnitType } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";

type AiDiagnosticsSummary = {
  currentStatePasses: number;
  currentStateWarnings: number;
  currentStateFailures: number;
  simulationCount: number;
  latestSimulationWinner: string | null;
};

type DeveloperDrawerProps = {
  open: boolean;
  playerFogEnabled: boolean;
  playerInstantBuild: boolean;
  selectedDevSide: Side;
  selectedDevUnitType: UnitType;
  selectedDevImprovementType: DeveloperPlacementType;
  pendingDevPlacement: { side: Side; unitType: UnitType } | null;
  pendingDevImprovementPlacement: { side: Side; improvementType: DeveloperPlacementType } | null;
  aiDebugPlan: AiTurnPlan;
  aiDebugTacticalPreview: AiDebugTacticalPreview[];
  aiDiagnosticsReport: AiDiagnosticsReport | null;
  aiDiagnosticsSummary: AiDiagnosticsSummary | null;
  onClose: () => void;
  onTogglePlayerFog: () => void;
  onTogglePlayerInstantBuild: () => void;
  onGrantCredits: () => void;
  onDevSideChange: (side: Side) => void;
  onDevUnitTypeChange: (unitType: UnitType) => void;
  onDevImprovementTypeChange: (improvementType: DeveloperPlacementType) => void;
  onBeginAddUnit: () => void;
  onBeginAddImprovement: () => void;
  onCancelAddUnit: () => void;
  onCancelAddImprovement: () => void;
  onSimulateVictory: () => void;
  onSimulateDefeat: () => void;
  onRunAiDiagnostics: () => void;
  onRunAiMirrorSimulationBatch: () => void;
};

export function DeveloperDrawer({
  open,
  playerFogEnabled,
  playerInstantBuild,
  selectedDevSide,
  selectedDevUnitType,
  selectedDevImprovementType,
  pendingDevPlacement,
  pendingDevImprovementPlacement,
  aiDebugPlan,
  aiDebugTacticalPreview,
  aiDiagnosticsReport,
  aiDiagnosticsSummary,
  onClose,
  onTogglePlayerFog,
  onTogglePlayerInstantBuild,
  onGrantCredits,
  onDevSideChange,
  onDevUnitTypeChange,
  onDevImprovementTypeChange,
  onBeginAddUnit,
  onBeginAddImprovement,
  onCancelAddUnit,
  onCancelAddImprovement,
  onSimulateVictory,
  onSimulateDefeat,
  onRunAiDiagnostics,
  onRunAiMirrorSimulationBatch,
}: DeveloperDrawerProps) {
  const threatSummary = aiDebugPlan.context.threatSummary;
  const getDeveloperPlacementLabel = (placementType: DeveloperPlacementType) =>
    placementType === "city" ? "City" : getImprovementTypeLabel(placementType);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} />}
      <aside
        className={[
          "fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-800 bg-slate-900 p-4 shadow-2xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-semibold">
            <Bug className="h-5 w-5" /> Developer Tools
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="mt-6 flex-1 space-y-6 overflow-y-auto pr-1 text-sm">
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <label className="cursor-pointer flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Player fog of war</div>
                <div className="text-slate-300">Turn full player map visibility on or off for debugging.</div>
              </div>
              <input
                type="checkbox"
                checked={playerFogEnabled}
                onChange={onTogglePlayerFog}
                className="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-950 text-amber-400 accent-amber-400"
              />
            </label>
            <label className="cursor-pointer flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">Player instant build</div>
                <div className="text-slate-300">Automatically complete every new player production order as soon as it is queued.</div>
              </div>
              <input
                type="checkbox"
                checked={playerInstantBuild}
                onChange={onTogglePlayerInstantBuild}
                className="mt-1 h-5 w-5 rounded border-slate-700 bg-slate-950 text-amber-400 accent-amber-400"
              />
            </label>
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="font-semibold">Developer unit placement</div>
            <div className="text-slate-300">Choose a unit, then place it on a highlighted legal tile on the map.</div>
            <div className="relative">
              <select
                value={selectedDevSide}
                onChange={(event) => onDevSideChange(event.target.value as Side)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-300"
              >
                <option value="player">Player 1</option>
                <option value="ai">Enemy</option>
              </select>
            </div>
            <div className="relative">
              <select
                value={selectedDevUnitType}
                onChange={(event) => onDevUnitTypeChange(event.target.value as UnitType)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-300"
              >
                {UNIT_TYPE_ORDER.map((unitType) => (
                  <option key={unitType} value={unitType}>
                    {getUnitTypeLabel(unitType)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={onBeginAddUnit}>
                Add Unit To Map
              </Button>
              {pendingDevPlacement ? (
                <Button variant="outline" onClick={onCancelAddUnit}>
                  Cancel Placement
                </Button>
              ) : null}
            </div>
            {pendingDevPlacement ? (
              <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                Place mode active for {pendingDevPlacement.side === "player" ? "Player 1" : "Enemy"} {getUnitTypeLabel(pendingDevPlacement.unitType)}. Click a highlighted legal tile on the map.
              </div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="font-semibold">Developer improvement placement</div>
            <div className="text-slate-300">Place bridge, tunnel, city, port, airfield, radar, or outpost directly on any highlighted legal tile without using an engineer.</div>
            <div className="relative">
              <select
                value={selectedDevImprovementType}
                onChange={(event) => onDevImprovementTypeChange(event.target.value as DeveloperPlacementType)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none focus:border-amber-300"
              >
                <option value="bridge">Bridge</option>
                <option value="tunnel">Tunnel</option>
                <option value="city">City</option>
                <option value="port">Port</option>
                <option value="airfield">Airfield</option>
                <option value="radar">Radar Upgrade</option>
                <option value="outpost">Outpost</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={onBeginAddImprovement}>
                Add Improvement
              </Button>
              {pendingDevImprovementPlacement ? (
                <Button variant="outline" onClick={onCancelAddImprovement}>
                  Cancel Placement
                </Button>
              ) : null}
            </div>
            {pendingDevImprovementPlacement ? (
              <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-3 text-xs text-cyan-100">
                Place mode active for {pendingDevImprovementPlacement.side === "player" ? "Player 1" : "Enemy"} {getDeveloperPlacementLabel(pendingDevImprovementPlacement.improvementType).toLowerCase()}. Click a highlighted legal tile on the map.
              </div>
            ) : null}
          </div>
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="font-semibold">Developer actions</div>
            <div className="text-slate-300">Quick state changes for testing economy, production, and endgame presentation.</div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={onGrantCredits}>
                +1000 Credits
              </Button>
              <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400" onClick={onSimulateVictory}>
                Simulate Victory
              </Button>
              <Button className="bg-red-500 text-slate-950 hover:bg-red-400" onClick={onSimulateDefeat}>
                Simulate Defeat
              </Button>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-cyan-900/60 bg-cyan-950/15 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold text-cyan-100">AI debug board</div>
                <div className="text-slate-300">Live goals, build decisions, missions, and tactical posture for the current state.</div>
              </div>
              <div className="rounded-xl border border-cyan-800/40 bg-slate-950/70 px-3 py-2 text-right text-xs text-cyan-100">
                <div>{aiDebugPlan.context.aiUnits.length} AI units</div>
                <div>{aiDebugPlan.context.sites.length} sites</div>
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                <div className="font-semibold text-slate-100">Threat summary</div>
                <div className="mt-2 space-y-1">
                  <div>{threatSummary.threatenedSites.length} threatened site(s)</div>
                  <div>{threatSummary.knownEnemyUnitCount} known enemy unit(s)</div>
                  <div>{threatSummary.knownEnemyCityCount} known enemy city target(s)</div>
                  <div>{threatSummary.unexploredTileCount} unexplored tile(s)</div>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs text-slate-200">
                <div className="font-semibold text-slate-100">Latest diagnostics</div>
                {aiDiagnosticsSummary ? (
                  <div className="mt-2 space-y-1">
                    <div>{aiDiagnosticsSummary.currentStatePasses} pass, {aiDiagnosticsSummary.currentStateWarnings} warn, {aiDiagnosticsSummary.currentStateFailures} fail</div>
                    <div>{aiDiagnosticsSummary.simulationCount} mirror sim(s)</div>
                    <div>Last sim winner: {aiDiagnosticsSummary.latestSimulationWinner ?? "none"}</div>
                  </div>
                ) : (
                  <div className="mt-2 text-slate-400">No diagnostics run yet.</div>
                )}
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="secondary" onClick={onRunAiDiagnostics}>
                Run AI Diagnostics
              </Button>
              <Button variant="secondary" onClick={onRunAiMirrorSimulationBatch}>
                Run 5 AI Mirror Sims
              </Button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
              <div className="font-semibold text-slate-100">Top strategic goals</div>
              <div className="mt-2 space-y-2 text-slate-200">
                {aiDebugPlan.strategicGoals.slice(0, 5).map((goal) => (
                  <div key={`${goal.type}-${goal.x}-${goal.y}`} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="font-medium text-slate-100">{goal.type} · {goal.score}</div>
                    <div>{goal.summary}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
              <div className="font-semibold text-slate-100">Planned production</div>
              <div className="mt-2 space-y-2 text-slate-200">
                {aiDebugPlan.productionDecisions.length > 0 ? aiDebugPlan.productionDecisions.slice(0, 6).map((decision) => (
                  <div key={`${decision.x}-${decision.y}-${decision.unitType}`} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="font-medium text-slate-100">
                      {getUnitTypeLabel(decision.unitType)} at ({decision.x + 1}, {decision.y + 1}) · {Math.round(decision.score)}
                    </div>
                    <div>{decision.reason}</div>
                  </div>
                )) : (
                  <div className="text-slate-400">No build queue for the current treasury and site state.</div>
                )}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
              <div className="font-semibold text-slate-100">Assigned missions</div>
              <div className="mt-2 space-y-2 text-slate-200">
                {aiDebugPlan.unitMissions.slice(0, 8).map((mission) => (
                  <div key={mission.unitId} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="font-medium text-slate-100">
                      {getUnitTypeLabel(mission.unitType)} · {mission.role} -&gt; {mission.missionType}
                    </div>
                    <div>{mission.summary}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
              <div className="font-semibold text-slate-100">Tactical posture sample</div>
              <div className="mt-2 space-y-2 text-slate-200">
                {aiDebugTacticalPreview.length > 0 ? aiDebugTacticalPreview.map((preview) => (
                  <div key={preview.unitId} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                    <div className="font-medium text-slate-100">
                      {getUnitTypeLabel(preview.unitType)} · {preview.shouldRetreat ? "retreat" : "engage"} · move {preview.moveLeft}
                    </div>
                    <div>
                      {preview.role} -&gt; {preview.missionType} at ({preview.targetX + 1}, {preview.targetY + 1}) · threat {Math.round(preview.localThreat)} / support {Math.round(preview.localSupport)}
                    </div>
                  </div>
                )) : (
                  <div className="text-slate-400">No tactical preview available.</div>
                )}
              </div>
            </div>
            {aiDiagnosticsReport ? (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
                  <div className="font-semibold text-slate-100">Diagnostic checks</div>
                  <div className="mt-2 space-y-2 text-slate-200">
                    {aiDiagnosticsReport.currentStateResults.map((result) => (
                      <div key={result.id} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                        <div className="font-medium text-slate-100">
                          {result.label} · {result.status}
                        </div>
                        <div>{result.details}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs">
                  <div className="font-semibold text-slate-100">Mirror simulations</div>
                  <div className="mt-2 space-y-2 text-slate-200">
                    {aiDiagnosticsReport.simulations.length > 0 ? aiDiagnosticsReport.simulations.map((simulation) => (
                      <div key={simulation.seed} className="rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                        <div className="font-medium text-slate-100">
                          Seed {simulation.seed} · {simulation.winner ?? "no winner"} · turn {simulation.turn}
                        </div>
                        <div>
                          {simulation.ending === "winner" ? "Match resolved" : "Turn limit reached"} · cities {simulation.playerCities}/{simulation.aiCities} · units {simulation.playerUnits}/{simulation.aiUnits}
                        </div>
                      </div>
                    )) : (
                      <div className="text-slate-400">Run mirror simulations to populate this section.</div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </aside>
    </>
  );
}
