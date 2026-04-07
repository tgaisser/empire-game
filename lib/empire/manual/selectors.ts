import { GAME_TYPE_OPTIONS, TERRAIN, UNIT_STATS } from "@/lib/empire/config";
import { IMPROVEMENT_DEFINITIONS } from "@/lib/empire/data/improvements";
import {
  CARRIER_AIR_CAPACITY,
  CARRIER_JAM_MAX_DAMAGE,
  CARRIER_JAM_RANGE,
  DESTROYER_ESCORT_ARMOR_BONUS,
  DESTROYER_ESCORT_RANGE,
  LAND_BASE_AIR_CAPACITY,
} from "@/lib/empire/data/rules";
import { getImprovementTypeLabel, IMPROVEMENT_TYPE_ORDER, UNIT_TYPE_ORDER } from "@/lib/empire/catalog";
import { CAMPAIGN_ENTRIES } from "@/lib/empire/manual/content/campaigns";
import { DOMAIN_ENTRIES } from "@/lib/empire/manual/content/domains";
import { IMPROVEMENT_MANUAL_ENTRIES } from "@/lib/empire/manual/content/improvements";
import { QUICK_START_CARDS } from "@/lib/empire/manual/content/quickStart";
import { RULE_ENTRIES } from "@/lib/empire/manual/content/rules";
import { TACTIC_ENTRIES } from "@/lib/empire/manual/content/tactics";
import { TERRAIN_ENTRIES } from "@/lib/empire/manual/content/terrain";
import { UNIT_MANUAL_ENTRIES } from "@/lib/empire/manual/content/units";
import type {
  ManualFact,
  ManualImprovementReference,
  ManualReferenceSection,
  ManualRelatedLink,
  ManualUnitReference,
} from "@/lib/empire/manual/types";
import type { GameType, TileImprovementType, UnitType } from "@/lib/empire/types";

function formatAttackDomains(unitType: UnitType) {
  const attackDomains = UNIT_STATS[unitType].attackDomains;
  return attackDomains.length > 0 ? attackDomains.join(", ") : "none";
}

function buildUnitFacts(unitType: UnitType): ManualFact[] {
  const unit = UNIT_STATS[unitType];
  const facts: ManualFact[] = [
    { label: "Domain", value: unit.domain },
    { label: "Cost", value: `${unit.cost}` },
    { label: "Build", value: `${unit.buildTime} turns` },
    { label: "Move", value: `${unit.move}` },
    { label: "Vision", value: `${unit.vision}` },
    { label: "Attack", value: `${unit.atk}` },
    { label: "Armor", value: `${unit.armor}` },
    { label: "Piercing", value: `${unit.piercing}` },
    { label: "HP", value: `${unit.maxHp}` },
    { label: "Targets", value: formatAttackDomains(unitType) },
  ];

  if (unit.transportCapacity) facts.push({ label: "Transport", value: `${unit.transportCapacity} slots` });
  if (unit.airDetectionRange) facts.push({ label: "Air Detection", value: `${unit.airDetectionRange}` });
  if (unit.radarRelayRange) facts.push({ label: "Relay Range", value: `${unit.radarRelayRange}` });
  if (unit.bombCapacity) facts.push({ label: "Bomb Load", value: `${unit.bombCapacity}` });
  if (unit.maxTurnsAwayFromBase) facts.push({ label: "Endurance", value: `${unit.maxTurnsAwayFromBase} turns` });
  if (unit.antiAirBonus) facts.push({ label: "Anti-Air", value: `+${unit.antiAirBonus}` });

  return facts;
}

function buildUnitCapabilities(unitType: UnitType) {
  const unit = UNIT_STATS[unitType];
  const capabilities: string[] = [];

  capabilities.push(unit.canCapture ? "Can capture cities and strategic sites." : "Cannot capture cities.");
  capabilities.push(unit.canAttack ? "Can attack." : "Non-combat unit.");

  if (unit.canLandOnCarrier) capabilities.push("Can recover to carriers.");
  if (unit.canOnlyLandOnAirfield) capabilities.push("Requires an airfield to land.");
  if (unit.canDetectSpies) capabilities.push("Can detect stealth land operatives.");
  if (unit.canAttackSubmarines) capabilities.push("Can attack submarines.");
  if (unit.canCallAirStrike) capabilities.push("Can call air strikes.");
  if (unit.ignoresFortification) capabilities.push("Ignores fortification when attacking.");
  if (unit.selfDestructOnAttack) capabilities.push("Self-destructs when it attacks.");
  if (unit.attackRequiresSameTile) capabilities.push("Must attack directly on the target tile.");

  return capabilities;
}

function buildUnitSpecialRules(unitType: UnitType) {
  const unit = UNIT_STATS[unitType];
  const rules: string[] = [];

  if (unitType === "spy") rules.push("Extends to long-range vision when operating in its recon posture.");
  if (unit.concealedWhileStationary) rules.push("Conceals while stationary.");
  if (unit.canBeDetectedBySonarOnly) rules.push("Requires sonar-specific detection to reveal reliably.");
  if (unit.transportCapacity && unitType === "troop-transport") {
    rules.push("Cargo is space-based: tanks consume the full hold while light units share it.");
    rules.push(`Destroyer escorts within ${DESTROYER_ESCORT_RANGE} tiles grant +${DESTROYER_ESCORT_ARMOR_BONUS} armor.`);
  }
  if (unitType === "carrier") {
    rules.push(`Supports up to ${CARRIER_AIR_CAPACITY} friendly carrier-capable aircraft on its tile.`);
    rules.push(`Can jam nearby drone swarms within ${CARRIER_JAM_RANGE} tiles for up to ${CARRIER_JAM_MAX_DAMAGE} damage.`);
  }
  if (unitType === "bomber") rules.push("Rearms bombs only when back on a friendly legal base.");
  if (unitType === "submarine") rules.push("A successful submarine strike sinks a carrier outright.");
  if (unitType === "drone-swarm") rules.push("Uses a same-tile self-destruct strike rather than surviving a normal attack exchange.");
  if (unit.domain === "air") {
    rules.push(`Standard land air bases support ${LAND_BASE_AIR_CAPACITY} friendly aircraft in a tile.`);
  }

  return rules;
}

function buildImprovementFacts(improvementType: TileImprovementType): ManualFact[] {
  const improvement = IMPROVEMENT_DEFINITIONS[improvementType];
  const facts: ManualFact[] = [
    { label: "Build Cost", value: `${improvement.buildCost}` },
    { label: "Build Time", value: `${improvement.buildTime} turns` },
  ];

  if (improvement.maxHp) facts.push({ label: "HP", value: `${improvement.maxHp}` });
  if (improvement.armor) facts.push({ label: "Armor", value: `${improvement.armor}` });
  if (improvement.detectionRange) facts.push({ label: "Detects", value: `${improvement.detectionRange} tiles` });
  if (improvement.triggerDamage) facts.push({ label: "Trigger Damage", value: `${improvement.triggerDamage}` });

  return facts;
}

function buildImprovementSpecialRules(improvementType: TileImprovementType) {
  const improvement = IMPROVEMENT_DEFINITIONS[improvementType];
  const rules: string[] = [];

  if (improvement.upgradeOf) rules.push(`Built as an upgrade on a friendly ${getImprovementTypeLabel(improvement.upgradeOf)}.`);
  if (improvement.hiddenUntilDetected) rules.push("Hidden from the enemy until properly detected.");
  if (improvementType === "minefield") rules.push("Enemy engineers can reveal and disarm it safely.");
  if (improvementType === "bridge" || improvementType === "tunnel") rules.push("Can be demolished to collapse a route.");

  return rules;
}

export function getManualUnitReference(unitType: UnitType): ManualUnitReference {
  const unit = UNIT_STATS[unitType];
  return {
    id: unitType,
    title: unit.name,
    summary: UNIT_MANUAL_ENTRIES[unitType].summary,
    domain: unit.domain,
    facts: buildUnitFacts(unitType),
    capabilities: buildUnitCapabilities(unitType),
    specialRules: buildUnitSpecialRules(unitType),
    entry: UNIT_MANUAL_ENTRIES[unitType],
  };
}

export function getManualImprovementReference(improvementType: TileImprovementType): ManualImprovementReference {
  return {
    id: improvementType,
    title: getImprovementTypeLabel(improvementType),
    summary: IMPROVEMENT_MANUAL_ENTRIES[improvementType].summary,
    facts: buildImprovementFacts(improvementType),
    specialRules: buildImprovementSpecialRules(improvementType),
    entry: IMPROVEMENT_MANUAL_ENTRIES[improvementType],
  };
}

export function getManualUnitReferences() {
  return UNIT_TYPE_ORDER.map((unitType) => getManualUnitReference(unitType));
}

export function getManualImprovementReferences() {
  return IMPROVEMENT_TYPE_ORDER.map((improvementType) => getManualImprovementReference(improvementType));
}

export function getManualDomainEntries() {
  return DOMAIN_ENTRIES;
}

export function getManualRuleEntries() {
  return RULE_ENTRIES;
}

export function getManualTerrainEntries() {
  return TERRAIN_ENTRIES.map((entry) => ({
    ...entry,
    terrain: TERRAIN[entry.id],
  }));
}

export function getManualCampaignEntries() {
  return CAMPAIGN_ENTRIES;
}

export function getManualQuickStartCards() {
  return QUICK_START_CARDS;
}

export function getManualTacticEntries() {
  return TACTIC_ENTRIES;
}

type SearchRecord = {
  kind: ManualRelatedLink["kind"];
  id: string;
  section: ManualReferenceSection | "quick-start" | "tactics";
  title: string;
  summary: string;
  keywords: string[];
};

function collectSearchRecords(): SearchRecord[] {
  const unitRecords: SearchRecord[] = getManualUnitReferences().map((entry) => ({
    kind: "unit",
    id: entry.id,
    section: "units",
    title: entry.title,
    summary: entry.summary,
    keywords: [
      entry.domain,
      ...entry.capabilities,
      ...entry.specialRules,
      ...entry.entry.role,
      ...entry.entry.worksWellWith.map((link) => `${link.label} ${link.note ?? ""}`),
      ...entry.entry.counteredBy.map((link) => `${link.label} ${link.note ?? ""}`),
    ],
  }));

  const improvementRecords: SearchRecord[] = getManualImprovementReferences().map((entry) => ({
    kind: "improvement",
    id: entry.id,
    section: "improvements",
    title: entry.title,
    summary: entry.summary,
    keywords: [
      ...entry.specialRules,
      ...entry.entry.whenToBuild,
      ...entry.entry.related.map((link) => `${link.label} ${link.note ?? ""}`),
    ],
  }));

  const domainRecords: SearchRecord[] = DOMAIN_ENTRIES.map((entry) => ({
    kind: "domain",
    id: entry.domain,
    section: "domains",
    title: `${entry.domain[0].toUpperCase()}${entry.domain.slice(1)} Doctrine`,
    summary: entry.summary,
    keywords: [...entry.sections.flatMap((section) => section.body), ...entry.related.map((link) => `${link.label} ${link.note ?? ""}`)],
  }));

  const ruleRecords: SearchRecord[] = RULE_ENTRIES.map((entry) => ({
    kind: "rule",
    id: entry.id,
    section: "rules",
    title: entry.title,
    summary: entry.summary,
    keywords: [...entry.sections.flatMap((section) => section.body), ...entry.related.map((link) => `${link.label} ${link.note ?? ""}`)],
  }));

  const terrainRecords: SearchRecord[] = TERRAIN_ENTRIES.map((entry) => ({
    kind: "terrain",
    id: entry.id,
    section: "terrain",
    title: entry.title,
    summary: entry.summary,
    keywords: [...entry.sections.flatMap((section) => section.body), ...entry.related.map((link) => `${link.label} ${link.note ?? ""}`)],
  }));

  const campaignRecords: SearchRecord[] = CAMPAIGN_ENTRIES.map((entry) => ({
    kind: "campaign",
    id: entry.gameType,
    section: "campaigns",
    title: entry.title,
    summary: entry.summary,
    keywords: entry.sections.flatMap((section) => section.body),
  }));

  const quickStartRecords: SearchRecord[] = QUICK_START_CARDS.map((entry) => ({
    kind: "rule",
    id: entry.id,
    section: "quick-start",
    title: entry.title,
    summary: entry.body[0] ?? "",
    keywords: entry.body,
  }));

  const tacticRecords: SearchRecord[] = TACTIC_ENTRIES.map((entry) => ({
    kind: "tactic",
    id: entry.id,
    section: "tactics",
    title: entry.title,
    summary: entry.summary,
    keywords: entry.sections.flatMap((section) => section.body),
  }));

  return [
    ...unitRecords,
    ...improvementRecords,
    ...domainRecords,
    ...ruleRecords,
    ...terrainRecords,
    ...campaignRecords,
    ...quickStartRecords,
    ...tacticRecords,
  ];
}

const SEARCH_INDEX = collectSearchRecords();

export function searchManualIndex(query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return SEARCH_INDEX;

  return SEARCH_INDEX.filter((record) => {
    const haystack = [record.title, record.summary, ...record.keywords].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

export function getCampaignLabel(gameType: GameType) {
  return GAME_TYPE_OPTIONS.find((option) => option.id === gameType)?.label ?? gameType;
}
