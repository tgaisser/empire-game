import asianCapitals from "@/lib/empire/data/asian-capitals.json";
import africaCapitals from "@/lib/empire/data/africa-capitals.json";
import chinaCapitals from "@/lib/empire/data/china-capitals.json";
import iranCities from "@/lib/empire/data/iran-cities.json";
import israelCities from "@/lib/empire/data/israel-cities.json";
import usaStateCapitals from "@/lib/empire/data/usa-state-capitals.json";
import type { Faction, Side } from "@/lib/empire/types";

export type FactionOption = {
  id: Faction;
  label: string;
  cityListLabel: string;
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

export const FACTION_OPTIONS: Array<FactionOption> = [
  {
    id: "usa",
    label: "USA",
    cityListLabel: "USA State Capitals",
    accentClass: "from-[#b31942]/42 via-[#0a3161]/18 to-white/8",
    chipClass: "bg-[#b31942]/24 border-[#0a3161]/52",
    textClass: "text-[#b31942]",
    ringClass: "ring-[#0a3161] border-blue-950/20",
    primaryClass: "text-[#b31942]",
    secondaryClass: "text-[#0a3161]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#b31942]",
    borderClass: "border-[#0a3161]",
  },
  {
    id: "asia",
    label: "Asia",
    cityListLabel: "Asian Capitals",
    accentClass: "from-[#facc15]/34 via-white/12 to-[#ef4444]/10",
    chipClass: "bg-[#facc15]/20 border-white/44",
    textClass: "text-[#facc15]",
    ringClass: "ring-white border-slate-200/20",
    primaryClass: "text-[#facc15]",
    secondaryClass: "text-white",
    tertiaryClass: "text-[#ef4444]",
    badgeBackgroundClass: "bg-[#facc15]",
    borderClass: "border-white",
  },
  {
    id: "china",
    label: "China",
    cityListLabel: "Chinese Command Cities",
    accentClass: "from-[#EE1C25]/36 via-[#FFFF00]/12 to-yellow-100/6",
    chipClass: "bg-[#EE1C25]/20 border-[#FFFF00]/44",
    textClass: "text-[#EE1C25]",
    ringClass: "ring-[#FFFF00] border-yellow-900/20",
    primaryClass: "text-[#EE1C25]",
    secondaryClass: "text-[#FFFF00]",
    tertiaryClass: "text-[#FFFF00]",
    badgeBackgroundClass: "bg-[#EE1C25]",
    borderClass: "border-[#FFFF00]",
  },
  {
    id: "africa",
    label: "Africa",
    cityListLabel: "African Capitals",
    accentClass: "from-[#dc2626]/34 via-[#0f8a43]/12 to-black/10",
    chipClass: "bg-[#dc2626]/20 border-[#0f8a43]/44",
    textClass: "text-[#dc2626]",
    ringClass: "ring-[#0f8a43] border-emerald-950/20",
    primaryClass: "text-[#dc2626]",
    secondaryClass: "text-[#0f8a43]",
    tertiaryClass: "text-black",
    badgeBackgroundClass: "bg-[#dc2626]",
    borderClass: "border-[#0f8a43]",
  },
  {
    id: "iran",
    label: "Iran",
    cityListLabel: "Iranian Cities",
    accentClass: "from-[#239f40]/34 via-[#da0000]/10 to-white/10",
    chipClass: "bg-[#239f40]/20 border-[#da0000]/40",
    textClass: "text-[#239f40]",
    ringClass: "ring-[#da0000] border-red-950/20",
    primaryClass: "text-[#239f40]",
    secondaryClass: "text-[#da0000]",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#239f40]",
    borderClass: "border-[#da0000]",
  },
  {
    id: "israel",
    label: "Israel",
    cityListLabel: "Israeli Cities",
    accentClass: "from-[#005EB8]/34 via-white/10 to-sky-100/8",
    chipClass: "bg-[#005EB8]/20 border-[#93c5fd]/44",
    textClass: "text-[#005EB8]",
    ringClass: "ring-white border-slate-200/20",
    primaryClass: "text-[#005EB8]",
    secondaryClass: "text-white",
    tertiaryClass: "text-white",
    badgeBackgroundClass: "bg-[#005EB8]",
    borderClass: "border-white",
  },
];

export function getFactionOption(faction: Faction) {
  return FACTION_OPTIONS.find((option) => option.id === faction) ?? FACTION_OPTIONS[0];
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
  if (faction === "asia") return asianCapitals;
  if (faction === "china") return chinaCapitals;
  if (faction === "africa") return africaCapitals;
  if (faction === "iran") return iranCities;
  if (faction === "israel") return israelCities;
  return usaStateCapitals;
}

export function getSideFaction(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  if (sideOrOwner === "player") return playerFaction;
  if (sideOrOwner === "ai") return aiFaction;
  return null;
}
