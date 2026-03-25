'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NamePromptModalProps = {
  open: boolean;
  title: string;
  description: string;
  defaultValue: string;
  confirmLabel: string;
  onConfirm: (name: string) => void;
};

export function NamePromptModal({
  open,
  title,
  description,
  defaultValue,
  confirmLabel,
  onConfirm,
}: NamePromptModalProps) {
  const [value, setValue] = useState(defaultValue);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-lg border-slate-700 bg-slate-900/95 shadow-2xl">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-300">{description}</p>
          <input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                onConfirm(value);
              }
            }}
            className="h-12 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 text-slate-100 outline-none focus:border-amber-300"
          />
          <div className="flex justify-end">
            <Button className="rounded-2xl bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={() => onConfirm(value)}>
              {confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
