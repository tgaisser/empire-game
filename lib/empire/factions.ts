import { FACTIONS, FACTIONS_BY_ID, type FactionDefinition } from "@/lib/empire/data/factions";
import type { Faction, Side } from "@/lib/empire/types";

export type FactionOption = {
  id: Faction;
  label: string;
  leaderName: string;
  cityListLabel: string;
  capitalCity: string;
  accentClass: string;
  chipClass: string;
  textClass: string;
  ringClass: string;
  primaryClass: string;
  secondaryClass: string;
  tertiaryClass: string;
  badgeBackgroundClass: string;
  borderClass: string;
};

export type SideDisplayOption = {
  id: Side;
  label: string;
  chipClass: string;
  textClass: string;
  ringClass: string;
  primaryClass: string;
  secondaryClass: string;
  tertiaryClass: string;
  badgeBackgroundClass: string;
  borderClass: string;
  hex: string;
};

export const FACTION_OPTIONS: Array<FactionOption> = FACTIONS.map((faction) => ({
  id: faction.id,
  label: faction.label,
  leaderName: faction.leaderName,
  cityListLabel: faction.cityListLabel,
  capitalCity: faction.capitalCity,
  accentClass: faction.accentClass,
  chipClass: faction.chipClass,
  textClass: faction.textClass,
  ringClass: faction.ringClass,
  primaryClass: faction.primaryClass,
  secondaryClass: faction.secondaryClass,
  tertiaryClass: faction.tertiaryClass,
  badgeBackgroundClass: faction.badgeBackgroundClass,
  borderClass: faction.borderClass,
}));

const SIDE_DISPLAY_OPTIONS: Record<Side, SideDisplayOption> = {
  player: {
    id: "player",
    label: "Player",
    chipClass: "bg-[#38bdf8]/20 border-[#bae6fd]/40",
    textClass: "text-[#38bdf8]",
    ringClass: "ring-[#38bdf8] border-sky-950/20",
    primaryClass: "text-[#38bdf8]",
    secondaryClass: "text-[#bae6fd]",
    tertiaryClass: "text-[#111827]",
    badgeBackgroundClass: "bg-[#38bdf8]",
    borderClass: "border-[#bae6fd]",
    hex: "#38bdf8",
  },
  ai: {
    id: "ai",
    label: "Computer",
    chipClass: "bg-[#ec4899]/20 border-[#fbcfe8]/38",
    textClass: "text-[#ec4899]",
    ringClass: "ring-[#ec4899] border-pink-950/20",
    primaryClass: "text-[#ec4899]",
    secondaryClass: "text-[#fbcfe8]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#ec4899]",
    borderClass: "border-[#fbcfe8]",
    hex: "#ec4899",
  },
};

export function getFactionOption(faction: Faction) {
  return FACTION_OPTIONS.find((option) => option.id === faction) ?? FACTION_OPTIONS[0];
}

export function getFactionDefinition(faction: Faction): FactionDefinition {
  return FACTIONS_BY_ID[faction];
}

export function getFactionCapitalCity(faction: Faction) {
  return FACTIONS_BY_ID[faction].capitalCity;
}

export function getFactionLeaderName(faction: Faction) {
  return FACTIONS_BY_ID[faction].leaderName;
}

export function getSideDisplayOption(sideOrOwner: Side | null) {
  if (!sideOrOwner) return null;
  return SIDE_DISPLAY_OPTIONS[sideOrOwner];
}

function replaceClassPrefix(value: string, prefix: "text" | "bg" | "border" | "ring") {
  return value.replace(/^(text|bg|border|ring)-/, `${prefix}-`);
}

function swapFactionDisplayColors(option: FactionOption): FactionOption {
  const swappedPrimaryClass = option.secondaryClass;
  const swappedSecondaryClass = option.primaryClass;
  const ringParts = option.ringClass.split(" ");
  const ringTail = ringParts.slice(1).join(" ");

  return {
    ...option,
    textClass: swappedPrimaryClass,
    primaryClass: swappedPrimaryClass,
    secondaryClass: swappedSecondaryClass,
    badgeBackgroundClass: replaceClassPrefix(swappedPrimaryClass, "bg"),
    borderClass: replaceClassPrefix(swappedSecondaryClass, "border"),
    ringClass: [replaceClassPrefix(swappedSecondaryClass, "ring"), ringTail].filter(Boolean).join(" "),
  };
}

function applyTertiaryAsPrimary(option: FactionOption): FactionOption {
  const nextPrimaryClass = option.tertiaryClass;
  const nextSecondaryClass = option.primaryClass;
  const ringParts = option.ringClass.split(" ");
  const ringTail = ringParts.slice(1).join(" ");

  return {
    ...option,
    textClass: nextPrimaryClass,
    primaryClass: nextPrimaryClass,
    secondaryClass: nextSecondaryClass,
    badgeBackgroundClass: replaceClassPrefix(nextPrimaryClass, "bg"),
    borderClass: replaceClassPrefix(nextSecondaryClass, "border"),
    ringClass: [replaceClassPrefix(nextSecondaryClass, "ring"), ringTail].filter(Boolean).join(" "),
  };
}

export function getDisplayFactionOption(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  const faction = sideOrOwner === "player" ? playerFaction : sideOrOwner === "ai" ? aiFaction : null;
  if (!faction) return null;

  const option = getFactionOption(faction);
  if (sideOrOwner !== "ai") return option;

  const playerOption = getFactionOption(playerFaction);
  const secondaryCollision = playerOption.secondaryClass === option.secondaryClass;
  const primaryCollision = playerOption.primaryClass === option.primaryClass;

  if (!secondaryCollision && !primaryCollision) return option;

  const swappedOption = swapFactionDisplayColors(option);
  if (
    swappedOption.primaryClass !== playerOption.primaryClass &&
    swappedOption.secondaryClass !== playerOption.secondaryClass
  ) {
    return swappedOption;
  }

  const tertiaryOption = applyTertiaryAsPrimary(option);
  if (
    tertiaryOption.primaryClass !== playerOption.primaryClass &&
    tertiaryOption.primaryClass !== playerOption.secondaryClass
  ) {
    return tertiaryOption;
  }

  return swappedOption;
}

export function getFactionCityNames(faction: Faction) {
  return FACTIONS_BY_ID[faction].cityNames;
}

export function getSideFaction(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  if (sideOrOwner === "player") return playerFaction;
  if (sideOrOwner === "ai") return aiFaction;
  return null;
}
