import { getFactionLeaderName } from "@/lib/empire/factions";
import type { GameState } from "@/lib/empire/types";

const SAVE_VERSION = 2;
const LOCAL_STORAGE_KEY = "empire-autosave";

type SaveFile = {
  version: number;
  savedAt: string;
  turn: number;
  playerFaction: string;
  aiFaction: string;
  playerName: string;
  state: GameState;
};

type SaveSummary = {
  turn: number;
  playerFaction: string;
  aiFaction: string;
  playerName: string;
  savedAt: string;
};

function hydrateGameState(state: GameState): GameState {
  return {
    ...state,
    playerName: state.playerName?.trim() || getFactionLeaderName(state.playerFaction),
    movementPathsThisTurn: state.movementPathsThisTurn ?? [],
  };
}

function createSaveFile(state: GameState): SaveFile {
  return {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    turn: state.turn,
    playerFaction: state.playerFaction,
    aiFaction: state.aiFaction,
    playerName: state.playerName,
    state: hydrateGameState(state),
  };
}

// --- localStorage auto-save ---

export function autoSave(state: GameState): void {
  try {
    const save = createSaveFile(state);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(save));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

export function loadAutoSave(): GameState | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const save: SaveFile = JSON.parse(raw);
    if ((save.version !== 1 && save.version !== SAVE_VERSION) || !save.state) return null;
    return hydrateGameState(save.state);
  } catch {
    return null;
  }
}

export function getAutoSaveSummary(): SaveSummary | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const save: SaveFile = JSON.parse(raw);
    if (save.version !== 1 && save.version !== SAVE_VERSION) return null;
    const playerName = save.playerName?.trim() || save.state?.playerName?.trim() || getFactionLeaderName(save.state.playerFaction);
    return { turn: save.turn, playerFaction: save.playerFaction, aiFaction: save.aiFaction, playerName, savedAt: save.savedAt };
  } catch {
    return null;
  }
}

export function clearAutoSave(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch {
    // ignore
  }
}

// --- File download/upload ---

export function downloadSaveFile(state: GameState): void {
  const save = createSaveFile(state);
  const json = JSON.stringify(save);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `empire-save-turn${state.turn}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function uploadSaveFile(): Promise<GameState | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const save: SaveFile = JSON.parse(reader.result as string);
          if ((save.version !== 1 && save.version !== SAVE_VERSION) || !save.state) {
            resolve(null);
            return;
          }
          resolve(hydrateGameState(save.state));
        } catch {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsText(file);
    };
    input.click();
  });
}
