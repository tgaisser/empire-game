'use client';

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BookOpen, Search, X } from "lucide-react";
import {
  getFactionUnitBadgeClass,
  getFactionUnitBadgeStyle,
  getFactionUnitIconClass,
} from "@/components/empire/shared/domainStyles";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getManualCampaignEntries,
  getManualDomainEntries,
  getManualImprovementReferences,
  getManualQuickStartCards,
  getManualRuleEntries,
  getManualTacticEntries,
  getManualTerrainEntries,
  getManualUnitReferences,
  searchManualIndex,
  type ManualMode,
  type ManualRelatedLink,
  type ManualReferenceSection,
} from "@/lib/empire/manual";
import type { Faction, TileImprovementType, UnitDomain, UnitType } from "@/lib/empire/types";

type FieldManualModalProps = {
  open: boolean;
  playerFaction: Faction;
  focusLink?: ManualRelatedLink | null;
  onFocusHandled?: () => void;
  onClose: () => void;
};

type ManualSearchResult = ReturnType<typeof searchManualIndex>[number];

const MODE_LABELS: Array<{ id: ManualMode; label: string }> = [
  { id: "quick-start", label: "Quick Start" },
  { id: "reference", label: "Reference" },
  { id: "tactics", label: "Tactics" },
];

const REFERENCE_SECTIONS: Array<{ id: ManualReferenceSection; label: string }> = [
  { id: "units", label: "Units" },
  { id: "improvements", label: "Improvements" },
  { id: "domains", label: "Domain Rules" },
  { id: "rules", label: "Core Rules" },
  { id: "terrain", label: "Terrain" },
  { id: "campaigns", label: "Campaign Types" },
];

function getImprovementBadgeClass(improvementType: TileImprovementType) {
  if (improvementType === "port") {
    return "border-[#ff3b30]/72 bg-[linear-gradient(135deg,rgba(61,143,255,0.26),rgba(15,39,72,0.96))]";
  }
  if (improvementType === "airfield" || improvementType === "radar") {
    return "border-[#ff3b30]/72 bg-[linear-gradient(135deg,rgba(61,143,255,0.30),rgba(95,118,143,0.94))]";
  }
  return "border-stone-300/55 bg-[linear-gradient(135deg,rgba(214,211,209,0.22),rgba(51,65,85,0.92))]";
}

export function FieldManualModal({ open, playerFaction, focusLink = null, onFocusHandled, onClose }: FieldManualModalProps) {
  const [mode, setMode] = useState<ManualMode>("reference");
  const [referenceSection, setReferenceSection] = useState<ManualReferenceSection>("units");
  const [selectedUnitDomain, setSelectedUnitDomain] = useState<UnitDomain>("land");
  const [selectedUnitId, setSelectedUnitId] = useState<UnitType>("infantry");
  const [selectedImprovementId, setSelectedImprovementId] = useState<TileImprovementType>("bridge");
  const [selectedDomainId, setSelectedDomainId] = useState<UnitDomain>("land");
  const [selectedRuleId, setSelectedRuleId] = useState("movement-and-fortification");
  const [selectedTerrainId, setSelectedTerrainId] = useState<"land" | "water" | "mountain">("land");
  const [selectedCampaignId, setSelectedCampaignId] = useState("normal");
  const [selectedQuickStartId, setSelectedQuickStartId] = useState("first-turn");
  const [selectedTacticId, setSelectedTacticId] = useState("fleet-screening");
  const [searchQuery, setSearchQuery] = useState("");

  const quickStartCards = useMemo(() => getManualQuickStartCards(), []);
  const unitReferences = useMemo(() => getManualUnitReferences(), []);
  const improvementReferences = useMemo(() => getManualImprovementReferences(), []);
  const domainEntries = useMemo(() => getManualDomainEntries(), []);
  const ruleEntries = useMemo(() => getManualRuleEntries(), []);
  const terrainEntries = useMemo(() => getManualTerrainEntries(), []);
  const campaignEntries = useMemo(() => getManualCampaignEntries(), []);
  const tacticEntries = useMemo(() => getManualTacticEntries(), []);
  const searchResults = useMemo(() => searchManualIndex(searchQuery), [searchQuery]);

  const selectedQuickStart = quickStartCards.find((card) => card.id === selectedQuickStartId) ?? quickStartCards[0];
  const selectedUnit = unitReferences.find((entry) => entry.id === selectedUnitId) ?? unitReferences[0];
  const selectedImprovement = improvementReferences.find((entry) => entry.id === selectedImprovementId) ?? improvementReferences[0];
  const selectedDomain = domainEntries.find((entry) => entry.domain === selectedDomainId) ?? domainEntries[0];
  const selectedRule = ruleEntries.find((entry) => entry.id === selectedRuleId) ?? ruleEntries[0];
  const selectedTerrain = terrainEntries.find((entry) => entry.id === selectedTerrainId) ?? terrainEntries[0];
  const selectedCampaign = campaignEntries.find((entry) => entry.gameType === selectedCampaignId) ?? campaignEntries[0];
  const selectedTactic = tacticEntries.find((entry) => entry.id === selectedTacticId) ?? tacticEntries[0];

  const filteredUnits = unitReferences.filter((entry) => entry.domain === selectedUnitDomain);
  const showSearchResults = searchQuery.trim().length > 0;

  function handleSearchSelect(result: ManualSearchResult) {
    if (result.section === "quick-start") {
      setMode("quick-start");
      setSelectedQuickStartId(result.id);
      return;
    }

    if (result.section === "tactics") {
      setMode("tactics");
      setSelectedTacticId(result.id);
      return;
    }

    setMode("reference");
    setReferenceSection(result.section);

    if (result.section === "units" && result.kind === "unit") {
      const unit = unitReferences.find((entry) => entry.id === result.id);
      if (unit) {
        setSelectedUnitDomain(unit.domain);
        setSelectedUnitId(unit.id);
      }
      return;
    }

    if (result.section === "improvements" && result.kind === "improvement") {
      setSelectedImprovementId(result.id as TileImprovementType);
      return;
    }

    if (result.section === "domains" && result.kind === "domain") {
      setSelectedDomainId(result.id as UnitDomain);
      return;
    }

    if (result.section === "rules") {
      setSelectedRuleId(result.id);
      return;
    }

    if (result.section === "terrain") {
      setSelectedTerrainId(result.id as "land" | "water" | "mountain");
      return;
    }

    if (result.section === "campaigns") {
      setSelectedCampaignId(result.id);
    }
  }

  function handleRelatedSelect(link: ManualRelatedLink) {
    setSearchQuery("");

    if (link.kind === "tactic") {
      setMode("tactics");
      setSelectedTacticId(link.id);
      return;
    }

    setMode("reference");

    if (link.kind === "unit") {
      const unit = unitReferences.find((entry) => entry.id === link.id);
      setReferenceSection("units");
      if (unit) {
        setSelectedUnitDomain(unit.domain);
        setSelectedUnitId(unit.id);
      }
      return;
    }

    if (link.kind === "improvement") {
      setReferenceSection("improvements");
      setSelectedImprovementId(link.id as TileImprovementType);
      return;
    }

    if (link.kind === "domain") {
      setReferenceSection("domains");
      setSelectedDomainId(link.id as UnitDomain);
      return;
    }

    if (link.kind === "rule") {
      setReferenceSection("rules");
      setSelectedRuleId(link.id);
      return;
    }

    if (link.kind === "terrain") {
      setReferenceSection("terrain");
      setSelectedTerrainId(link.id as "land" | "water" | "mountain");
      return;
    }

    if (link.kind === "campaign") {
      setReferenceSection("campaigns");
      setSelectedCampaignId(link.id);
    }
  }

  const handleFocusLink = useEffectEvent((link: ManualRelatedLink) => {
    handleRelatedSelect(link);
    onFocusHandled?.();
  });

  useEffect(() => {
    if (!open || !focusLink) return;
    handleFocusLink(focusLink);
  }, [focusLink, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-start justify-center bg-slate-950/82 p-3 backdrop-blur-sm md:p-4">
      <div className="absolute inset-0" onClick={onClose} />
      <Card className="relative z-10 flex h-[calc(100dvh-1.5rem)] max-h-[92vh] w-full max-w-7xl flex-col gap-0 overflow-hidden border-slate-800 bg-slate-900 py-0 shadow-2xl md:h-[calc(100dvh-2rem)]">
        <CardHeader className="shrink-0 border-b border-slate-800 bg-slate-950/70 pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl text-slate-100">
                <BookOpen className="h-5 w-5" />
                Field Manual
              </CardTitle>
              <p className="mt-1 text-sm text-slate-400">
                Quick-start guidance, searchable reference entries, and doctrine notes for the whole campaign system.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex h-10 min-w-[min(100%,22rem)] items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-3 text-sm text-slate-300">
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search units, rules, tactics..."
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </label>
              <Button variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MODE_LABELS.map((entry) => (
              <Button
                key={entry.id}
                variant={mode === entry.id ? "secondary" : "outline"}
                className="rounded-2xl"
                onClick={() => setMode(entry.id)}
              >
                {entry.label}
              </Button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="min-h-0 flex-1 overflow-y-auto p-0">
          <div className="grid min-h-full grid-cols-1 xl:grid-cols-[220px_280px_minmax(0,1fr)]">
            <div className="border-b border-slate-800 bg-slate-950/40 xl:border-b-0 xl:border-r">
                <div className="p-4">
                  {mode === "reference" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Sections
                      </div>
                      {REFERENCE_SECTIONS.map((entry) => (
                        <Button
                          key={entry.id}
                          variant={referenceSection === entry.id ? "secondary" : "ghost"}
                          className="w-full justify-start rounded-2xl"
                          onClick={() => setReferenceSection(entry.id)}
                        >
                          {entry.label}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
                      <div className="text-base font-semibold text-white">
                        {mode === "quick-start" ? "How To Use This" : "Doctrine Notes"}
                      </div>
                      <p className="mt-2 leading-6">
                        {mode === "quick-start"
                          ? "Use Quick Start for the first few turns, then switch to Reference when you need exact behavior or unit matchups."
                          : "Tactics collects practical combinations and operational patterns that sit above the raw rules."}
                      </p>
                    </div>
                  )}
                </div>
            </div>

            <div className="border-b border-slate-800 bg-slate-900/60 xl:border-b-0 xl:border-r">
                <div className="p-4">
                  {showSearchResults ? (
                    <SearchResultsList results={searchResults} onSelect={handleSearchSelect} />
                  ) : mode === "quick-start" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Quick Start
                      </div>
                      {quickStartCards.map((card) => (
                        <SelectableItem
                          key={card.id}
                          active={selectedQuickStartId === card.id}
                          title={card.title}
                          description={card.body[0] ?? ""}
                          onClick={() => setSelectedQuickStartId(card.id)}
                        />
                      ))}
                    </div>
                  ) : mode === "tactics" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Tactics
                      </div>
                      {tacticEntries.map((entry) => (
                        <SelectableItem
                          key={entry.id}
                          active={selectedTacticId === entry.id}
                          title={entry.title}
                          description={entry.summary}
                          onClick={() => setSelectedTacticId(entry.id)}
                        />
                      ))}
                    </div>
                  ) : referenceSection === "units" ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Unit Browser
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(["land", "sea", "air"] as UnitDomain[]).map((domain) => (
                            <Button
                              key={domain}
                              variant={selectedUnitDomain === domain ? "secondary" : "outline"}
                              className="rounded-2xl capitalize"
                              onClick={() => setSelectedUnitDomain(domain)}
                            >
                              {domain}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        {filteredUnits.map((entry) => (
                          <SelectableItem
                            key={entry.id}
                            active={selectedUnitId === entry.id}
                            title={entry.title}
                            description={entry.summary}
                            icon={
                              <span
                                className={[
                                  "flex h-10 w-10 items-center justify-center rounded-full border border-slate-900/20 shadow-sm",
                                  getFactionUnitBadgeClass(entry.id, entry.domain, playerFaction),
                                ].join(" ")}
                                style={getFactionUnitBadgeStyle(entry.id, entry.domain, playerFaction)}
                              >
                                <UnitTypeIcon unitType={entry.id} className={getFactionUnitIconClass(playerFaction)} />
                              </span>
                            }
                            onClick={() => setSelectedUnitId(entry.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : referenceSection === "improvements" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Improvements
                      </div>
                      {improvementReferences.map((entry) => (
                        <SelectableItem
                          key={entry.id}
                          active={selectedImprovementId === entry.id}
                          title={entry.title}
                          description={entry.summary}
                          icon={
                            <span
                              className={[
                                "relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border text-white shadow-sm",
                                getImprovementBadgeClass(entry.id),
                              ].join(" ")}
                            >
                              <ImprovementIcon improvementType={entry.id} />
                            </span>
                          }
                          onClick={() => setSelectedImprovementId(entry.id)}
                        />
                      ))}
                    </div>
                  ) : referenceSection === "domains" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Domain Rules
                      </div>
                      {domainEntries.map((entry) => (
                        <SelectableItem
                          key={entry.domain}
                          active={selectedDomainId === entry.domain}
                          title={`${entry.domain[0].toUpperCase()}${entry.domain.slice(1)} Doctrine`}
                          description={entry.summary}
                          onClick={() => setSelectedDomainId(entry.domain)}
                        />
                      ))}
                    </div>
                  ) : referenceSection === "rules" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Core Rules
                      </div>
                      {ruleEntries.map((entry) => (
                        <SelectableItem
                          key={entry.id}
                          active={selectedRuleId === entry.id}
                          title={entry.title}
                          description={entry.summary}
                          onClick={() => setSelectedRuleId(entry.id)}
                        />
                      ))}
                    </div>
                  ) : referenceSection === "terrain" ? (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Terrain
                      </div>
                      {terrainEntries.map((entry) => (
                        <SelectableItem
                          key={entry.id}
                          active={selectedTerrainId === entry.id}
                          title={entry.title}
                          description={entry.summary}
                          onClick={() => setSelectedTerrainId(entry.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Campaign Types
                      </div>
                      {campaignEntries.map((entry) => (
                        <SelectableItem
                          key={entry.gameType}
                          active={selectedCampaignId === entry.gameType}
                          title={entry.title}
                          description={entry.summary}
                          onClick={() => setSelectedCampaignId(entry.gameType)}
                        />
                      ))}
                    </div>
                  )}
                </div>
            </div>

            <div className="bg-slate-900/30">
                <div className="p-4 md:p-5">
                  {showSearchResults ? (
                    <SearchDetailPanel query={searchQuery} />
                  ) : mode === "quick-start" ? (
                    <QuickStartDetail card={selectedQuickStart} />
                  ) : mode === "tactics" ? (
                    <ArticleDetail
                      title={selectedTactic.title}
                      summary={selectedTactic.summary}
                      sections={selectedTactic.sections}
                      related={selectedTactic.related}
                      onRelatedSelect={handleRelatedSelect}
                    />
                  ) : referenceSection === "units" ? (
                    <UnitDetail reference={selectedUnit} playerFaction={playerFaction} onRelatedSelect={handleRelatedSelect} />
                  ) : referenceSection === "improvements" ? (
                    <ImprovementDetail reference={selectedImprovement} onRelatedSelect={handleRelatedSelect} />
                  ) : referenceSection === "domains" ? (
                    <ArticleDetail
                      title={`${selectedDomain.domain[0].toUpperCase()}${selectedDomain.domain.slice(1)} Doctrine`}
                      summary={selectedDomain.summary}
                      sections={selectedDomain.sections}
                      related={selectedDomain.related}
                      onRelatedSelect={handleRelatedSelect}
                    />
                  ) : referenceSection === "rules" ? (
                    <ArticleDetail
                      title={selectedRule.title}
                      summary={selectedRule.summary}
                      sections={selectedRule.sections}
                      related={selectedRule.related}
                      onRelatedSelect={handleRelatedSelect}
                    />
                  ) : referenceSection === "terrain" ? (
                    <ArticleDetail
                      title={selectedTerrain.title}
                      summary={`${selectedTerrain.summary} ${selectedTerrain.terrain.moveCost >= 999 ? "Normally impassable to land units." : `Base move cost ${selectedTerrain.terrain.moveCost}.`}`}
                      sections={selectedTerrain.sections}
                      related={selectedTerrain.related}
                      onRelatedSelect={handleRelatedSelect}
                    />
                  ) : (
                    <ArticleDetail
                      title={selectedCampaign.title}
                      summary={selectedCampaign.summary}
                      sections={selectedCampaign.sections}
                    />
                  )}
                </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SearchResultsList({
  results,
  onSelect,
}: {
  results: ManualSearchResult[];
  onSelect: (result: ManualSearchResult) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        Search Results
      </div>
      {results.length === 0 ? (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-400">
          No entries match that search yet.
        </div>
      ) : (
        results.map((result) => (
          <SelectableItem
            key={`${result.section}-${result.id}`}
            active={false}
            title={result.title}
            description={`${getSectionLabel(result.section)} · ${result.summary}`}
            onClick={() => onSelect(result)}
          />
        ))
      )}
    </div>
  );
}

function SearchDetailPanel({ query }: { query: string }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-6 text-sm text-slate-300">
      <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Search</div>
      <div className="mt-2 text-2xl font-black text-white">Results For “{query}”</div>
      <p className="mt-3 leading-6">
        Pick an entry from the middle column to jump directly into that manual page. Search covers units, improvements,
        rules, terrain, campaign types, and tactics.
      </p>
    </div>
  );
}

function QuickStartDetail({ card }: { card: ReturnType<typeof getManualQuickStartCards>[number] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Quick Start</div>
        <div className="mt-2 text-2xl font-black text-white">{card.title}</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          {card.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function UnitDetail({
  reference,
  playerFaction,
  onRelatedSelect,
}: {
  reference: ReturnType<typeof getManualUnitReferences>[number];
  playerFaction: Faction;
  onRelatedSelect: (link: ManualRelatedLink) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <span
            className={[
              "flex h-16 w-16 items-center justify-center rounded-full border border-slate-900/20 shadow-lg",
              getFactionUnitBadgeClass(reference.id, reference.domain, playerFaction),
            ].join(" ")}
            style={getFactionUnitBadgeStyle(reference.id, reference.domain, playerFaction)}
          >
            <UnitTypeIcon unitType={reference.id} className={getFactionUnitIconClass(playerFaction)} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">{reference.domain} unit</div>
            <div className="mt-2 text-2xl font-black text-white">{reference.title}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{reference.summary}</p>
          </div>
        </div>
      </div>
      <FactGrid facts={reference.facts} />
      <ContentCard title="Capabilities" items={reference.capabilities} />
      <ContentCard title="Special Rules" items={reference.specialRules.length > 0 ? reference.specialRules : ["No additional special rules listed."]} />
      <ContentCard title="Role" items={reference.entry.role} />
      <ContentCard title="Strengths" items={reference.entry.strengths} />
      <ContentCard title="Weaknesses" items={reference.entry.weaknesses} />
      <ContentCard title="Operational Tips" items={reference.entry.tips} />
      <RelatedCard title="Works Well With" related={reference.entry.worksWellWith} onSelect={onRelatedSelect} />
      <RelatedCard title="Countered By" related={reference.entry.counteredBy} onSelect={onRelatedSelect} />
    </div>
  );
}

function ImprovementDetail({
  reference,
  onRelatedSelect,
}: {
  reference: ReturnType<typeof getManualImprovementReferences>[number];
  onRelatedSelect: (link: ManualRelatedLink) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-6">
        <div className="flex items-start gap-4">
          <span
            className={[
              "relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border text-white shadow-sm",
              getImprovementBadgeClass(reference.id),
            ].join(" ")}
          >
            <ImprovementIcon improvementType={reference.id} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Improvement</div>
            <div className="mt-2 text-2xl font-black text-white">{reference.title}</div>
            <p className="mt-3 text-sm leading-6 text-slate-300">{reference.summary}</p>
          </div>
        </div>
      </div>
      <FactGrid facts={reference.facts} />
      <ContentCard title="Special Rules" items={reference.specialRules.length > 0 ? reference.specialRules : ["No additional special rules listed."]} />
      <ContentCard title="When To Build" items={reference.entry.whenToBuild} />
      <ContentCard title="Strengths" items={reference.entry.strengths} />
      <ContentCard title="Risks" items={reference.entry.risks} />
      <RelatedCard title="Related Entries" related={reference.entry.related} onSelect={onRelatedSelect} />
    </div>
  );
}

function ArticleDetail({
  title,
  summary,
  sections,
  related,
  onRelatedSelect,
}: {
  title: string;
  summary: string;
  sections: Array<{ title: string; body: string[] }>;
  related?: ManualRelatedLink[];
  onRelatedSelect?: (link: ManualRelatedLink) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-6">
        <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Reference Entry</div>
        <div className="mt-2 text-2xl font-black text-white">{title}</div>
        <p className="mt-3 text-sm leading-6 text-slate-300">{summary}</p>
      </div>
      {sections.map((section) => (
        <ContentCard key={section.title} title={section.title} items={section.body} />
      ))}
      {related && related.length > 0 ? <RelatedCard title="Related Entries" related={related} onSelect={onRelatedSelect} /> : null}
    </div>
  );
}

function FactGrid({ facts }: { facts: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {facts.map((fact) => (
        <div key={`${fact.label}-${fact.value}`} className="rounded-3xl border border-slate-800 bg-slate-950/65 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{fact.label}</div>
          <div className="mt-1 text-lg font-semibold text-white">{fact.value}</div>
        </div>
      ))}
    </div>
  );
}

function ContentCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-5">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
        {items.map((item) => (
          <p key={item}>{item}</p>
        ))}
      </div>
    </div>
  );
}

function RelatedCard({
  title,
  related,
  onSelect,
}: {
  title: string;
  related: ManualRelatedLink[];
  onSelect?: (link: ManualRelatedLink) => void;
}) {
  return (
    <div className="rounded-[1.75rem] border border-slate-800 bg-slate-950/65 p-5">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {related.map((entry) => (
          <button
            key={`${title}-${entry.label}`}
            type="button"
            className="rounded-3xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-left transition hover:border-slate-500 hover:bg-slate-900"
            onClick={() => onSelect?.(entry)}
          >
            <div className="text-sm font-medium text-slate-100">{entry.label}</div>
            {entry.note ? <div className="mt-1 text-xs leading-5 text-slate-400">{entry.note}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectableItem({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean;
  title: string;
  description: string;
  icon?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-3xl border p-3 text-left transition",
        active
          ? "border-amber-300/40 bg-amber-400/10 shadow-[0_0_0_1px_rgba(251,191,36,0.14)]"
          : "border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80",
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        {icon ? <div className="shrink-0">{icon}</div> : null}
        <div className="min-w-0">
          <div className="font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs leading-5 text-slate-400">{description}</div>
        </div>
      </div>
    </button>
  );
}

function getSectionLabel(section: ManualSearchResult["section"]) {
  if (section === "quick-start") return "Quick Start";
  if (section === "tactics") return "Tactics";
  return REFERENCE_SECTIONS.find((entry) => entry.id === section)?.label ?? section;
}
