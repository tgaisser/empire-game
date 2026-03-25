'use client';

import { Castle } from "lucide-react";
import type { Tile, Unit, UnitDefinition, UnitType } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CityPanelProps = {
  city: Tile | null;
  occupant: Unit | null;
  playerCredits: number;
  unitDefinitions: Record<UnitType, UnitDefinition>;
  onBuild: (unitType: UnitType) => void;
};

export function CityPanel({ city, occupant, playerCredits, unitDefinitions, onBuild }: CityPanelProps) {
  if (!city) {
    return (
      <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Castle className="w-5 h-5" /> City Panel
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-400">
          Select one of your cities to review it and choose what to build.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/90 rounded-3xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Castle className="w-5 h-5" /> City Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2 text-slate-300">
          <div>City at ({city.x + 1}, {city.y + 1})</div>
          <div>Owner: {city.owner === "player" ? "Player" : city.owner === "ai" ? "Enemy" : "Neutral"}</div>
          <div>Garrison: {occupant ? `${occupant.owner === "player" ? "Friendly" : "Enemy"} ${occupant.type}` : "Empty"}</div>
        </div>
        <div className="grid gap-3">
          {(Object.entries(unitDefinitions) as Array<[UnitType, UnitDefinition]>).map(([unitType, unitDefinition]) => {
            const disabled = !!occupant || playerCredits < unitDefinition.cost || city.owner !== "player";

            return (
              <Button
                key={unitType}
                variant="outline"
                className="h-auto min-h-16 justify-between rounded-2xl px-4 py-3"
                disabled={disabled}
                onClick={() => onBuild(unitType)}
              >
                <span className="text-left">
                  <span className="block font-semibold">{unitDefinition.name}</span>
                  <span className="block text-xs text-slate-400">
                    Cost {unitDefinition.cost} • Build {unitDefinition.buildTime}t • {unitDefinition.domain}
                  </span>
                  <span className="block text-xs text-slate-400">
                    Move {unitDefinition.move} • Attack {unitDefinition.atk} • Armor {unitDefinition.armor} • Vision {unitDefinition.vision}
                  </span>
                  <span className="block text-xs text-slate-500">
                    Piercing {unitDefinition.piercing}
                  </span>
                </span>
                <span>{unitDefinition.shortLabel}</span>
              </Button>
            );
          })}
        </div>
        {occupant && <div className="text-xs text-slate-400">This city is occupied. Clear the tile to build a new unit.</div>}
        <div className="text-xs text-slate-500">
          Production is still instant for this prototype. Build time is already defined here for the future city queue system.
        </div>
      </CardContent>
    </Card>
  );
}
