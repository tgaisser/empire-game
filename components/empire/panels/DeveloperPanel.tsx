'use client';

import { Wrench } from "lucide-react";
import type { WorldSizeOption } from "@/lib/empire/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type DeveloperPanelProps = {
  worldSizeId: string;
  worldSizeOptions: WorldSizeOption[];
  playerFogEnabled: boolean;
  aiLimitedVision: boolean;
  onWorldSizeChange: (worldSizeId: string) => void;
  onGenerateWorld: () => void;
  onTogglePlayerFog: () => void;
  onToggleAiVision: () => void;
};

export function DeveloperPanel({
  worldSizeId,
  worldSizeOptions,
  playerFogEnabled,
  aiLimitedVision,
  onWorldSizeChange,
  onGenerateWorld,
  onTogglePlayerFog,
  onToggleAiVision,
}: DeveloperPanelProps) {
  return (
    <Card className="border-amber-700/40 bg-amber-950/20 rounded-3xl shadow-2xl">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Wrench className="w-5 h-5" /> Developer Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-3">
          <div className="space-y-2">
            <div className="font-semibold">New world size</div>
            <div className="text-slate-300">Choose the next world dimensions, then generate a fresh map. Current minimum stays at 16 x 12.</div>
            <div className="grid gap-2">
              {worldSizeOptions.map((option) => (
                <Button
                  key={option.id}
                  variant={worldSizeId === option.id ? "secondary" : "outline"}
                  className="justify-between"
                  onClick={() => onWorldSizeChange(option.id)}
                >
                  <span>{option.label}</span>
                  <span>{option.width} x {option.height}</span>
                </Button>
              ))}
            </div>
            <Button className="w-full" onClick={onGenerateWorld}>
              Generate New World
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">Player fog of war</div>
              <div className="text-slate-300">Turn full player map visibility on or off for debugging.</div>
            </div>
            <Button variant={playerFogEnabled ? "outline" : "secondary"} onClick={onTogglePlayerFog}>
              {playerFogEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">AI limited vision</div>
              <div className="text-slate-300">Make the AI obey fog, or restore perfect information for testing.</div>
            </div>
            <Button variant={aiLimitedVision ? "outline" : "secondary"} onClick={onToggleAiVision}>
              {aiLimitedVision ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
