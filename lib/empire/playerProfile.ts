import { getFactionLeaderName } from "@/lib/empire/factions";
import type { Faction } from "@/lib/empire/types";

const PLAYER_PROFILE_KEY = "empire-player-profile";

type StoredPlayerProfile = {
  preferredName: string;
  isCustom: boolean;
};

export function resolvePlayerName(name: string | null | undefined, faction: Faction) {
  const trimmed = name?.trim() ?? "";
  return trimmed || getFactionLeaderName(faction);
}

export function isCustomPlayerName(name: string | null | undefined, faction: Faction) {
  return resolvePlayerName(name, faction) !== getFactionLeaderName(faction);
}

export function loadPlayerProfile() {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(PLAYER_PROFILE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<StoredPlayerProfile>;
    const preferredName = typeof parsed.preferredName === "string" ? parsed.preferredName.trim() : "";
    return {
      preferredName,
      isCustom: Boolean(parsed.isCustom) && preferredName.length > 0,
    };
  } catch {
    return null;
  }
}

export function getPreferredPlayerName(faction: Faction) {
  const profile = loadPlayerProfile();
  if (!profile?.isCustom) return getFactionLeaderName(faction);
  return profile.preferredName;
}

export function savePlayerProfile(name: string, faction: Faction) {
  if (typeof window === "undefined") return;

  const preferredName = resolvePlayerName(name, faction);
  const profile: StoredPlayerProfile = {
    preferredName,
    isCustom: preferredName !== getFactionLeaderName(faction),
  };

  try {
    window.localStorage.setItem(PLAYER_PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // localStorage may be unavailable; keep play flow working.
  }
}
