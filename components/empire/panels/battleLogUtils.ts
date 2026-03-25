export type BattleLogFilter = "all" | "combat" | "capture" | "build" | "intel";

export const BATTLE_LOG_FILTERS: BattleLogFilter[] = ["all", "combat", "capture", "build", "intel"];

export function getBattleLogFilterLabel(filter: BattleLogFilter) {
  if (filter === "combat") return "Combat";
  if (filter === "capture") return "Capture";
  if (filter === "build") return "Build";
  if (filter === "intel") return "Intel";
  return "All";
}

export function matchesBattleLogFilter(log: string, filter: BattleLogFilter) {
  const lower = log.toLowerCase();
  if (filter === "combat") return /attack|destroyed|detonated|strike|jamming|bombard|cripple|shattered/.test(lower);
  if (filter === "capture") return /captured|control|rules the map/.test(lower);
  if (filter === "build") return /produced|completed|build|placed|installed|treasury/.test(lower);
  if (filter === "intel") return /turn|enemy turn|radar|visible|fog|exploration|commander/.test(lower);
  return true;
}

export function filterBattleLogs(logs: string[], filter: BattleLogFilter, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  return logs.filter((log) => {
    if (!matchesBattleLogFilter(log, filter)) return false;
    if (!normalizedQuery) return true;
    return log.toLowerCase().includes(normalizedQuery);
  });
}
