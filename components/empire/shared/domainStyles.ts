import type { CSSProperties } from "react";
import { getDisplayFactionOption, getFactionOption } from "@/lib/empire/factions";
import type { Faction, Side, UnitDomain, UnitType } from "@/lib/empire/types";

export function getDomainBadgeClass(domain: UnitDomain) {
  if (domain === "air") return "bg-[#5f768f] text-white";
  if (domain === "sea") return "bg-[#0f2748] text-white";
  return "bg-[#556b2f] text-white";
}

export function getFactionTintedDomainBadgeClass(domain: UnitDomain, faction: Faction | null) {
  const base = getDomainBadgeClass(domain);
  if (faction === "usa") {
    if (domain === "air") return `${base} bg-[linear-gradient(135deg,rgba(61,143,255,0.28),rgba(95,118,143,1))]`;
    if (domain === "sea") return `${base} bg-[linear-gradient(135deg,rgba(61,143,255,0.24),rgba(15,39,72,1))]`;
    return `${base} bg-[linear-gradient(135deg,rgba(61,143,255,0.18),rgba(85,107,47,1))]`;
  }

  if (faction === "asia") {
    if (domain === "air") return `${base} bg-[linear-gradient(135deg,rgba(248,113,113,0.3),rgba(95,118,143,1))]`;
    if (domain === "sea") return `${base} bg-[linear-gradient(135deg,rgba(248,113,113,0.24),rgba(15,39,72,1))]`;
    return `${base} bg-[linear-gradient(135deg,rgba(248,113,113,0.2),rgba(85,107,47,1))]`;
  }

  return base;
}

export function getFactionUnitBadgeClass(
  _unitType: UnitType,
  domain: UnitDomain,
  faction: Faction | null
) {
  if (faction) {
    return `${getFactionOption(faction).badgeBackgroundClass} text-white`;
  }

  return getFactionTintedDomainBadgeClass(domain, faction);
}

export function getSideUnitBadgeClass(
  _unitType: UnitType,
  domain: UnitDomain,
  playerFaction: Faction,
  aiFaction: Faction,
  sideOrOwner: Side | null
) {
  const displayOption = getDisplayFactionOption(playerFaction, aiFaction, sideOrOwner);
  if (displayOption) {
    return `${displayOption.badgeBackgroundClass} text-white`;
  }

  return getDomainBadgeClass(domain);
}

function resolveColorToken(className: string | undefined, fallback: string) {
  if (!className) return fallback;
  const hexMatch = className.match(/\[#([0-9a-fA-F]{3,8})\]/)?.[1];
  if (hexMatch) return `#${hexMatch}`;
  if (className.includes("text-white")) return "#ffffff";
  if (className.includes("text-black")) return "#000000";
  return fallback;
}

function getDomainBadgeStyle(domain: UnitDomain): CSSProperties {
  if (domain === "air") return { backgroundColor: "#5f768f" };
  if (domain === "sea") return { backgroundColor: "#0f2748" };
  return { backgroundColor: "#556b2f" };
}

function createSplitBadgeStyle(primaryClass: string, secondaryClass: string) {
  const topColor = resolveColorToken(primaryClass, "#475569");
  const bottomColor = resolveColorToken(secondaryClass, topColor);

  return {
    backgroundImage: `linear-gradient(180deg, ${topColor} 0%, ${topColor} 50%, ${bottomColor} 50%, ${bottomColor} 100%)`,
  } satisfies CSSProperties;
}

export function getFactionUnitBadgeStyle(
  _unitType: UnitType,
  domain: UnitDomain,
  faction: Faction | null
) {
  if (faction) {
    const option = getFactionOption(faction);
    return createSplitBadgeStyle(option.primaryClass, option.secondaryClass);
  }

  return getDomainBadgeStyle(domain);
}

export function getSideUnitBadgeStyle(
  _unitType: UnitType,
  domain: UnitDomain,
  playerFaction: Faction,
  aiFaction: Faction,
  sideOrOwner: Side | null
) {
  const displayOption = getDisplayFactionOption(playerFaction, aiFaction, sideOrOwner);
  if (displayOption) {
    return createSplitBadgeStyle(displayOption.primaryClass, displayOption.secondaryClass);
  }

  return getDomainBadgeStyle(domain);
}

export function getFactionUnitIconClass(faction: Faction | null) {
  return faction ? getFactionOption(faction).tertiaryClass : "text-white";
}

export function getSideUnitIconClass(playerFaction: Faction, aiFaction: Faction, sideOrOwner: Side | null) {
  return getDisplayFactionOption(playerFaction, aiFaction, sideOrOwner)?.tertiaryClass ?? "text-white";
}
