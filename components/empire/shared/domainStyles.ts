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
