'use client';

import type { CSSProperties, MouseEvent } from "react";
import type { TileClickTarget } from "@/components/empire/hooks/useEmpireGame";
import { getDisplayFactionOption, getSideDisplayOption } from "@/lib/empire/factions";
import {
  getSideUnitBadgeClass,
  getSideUnitBadgeStyle,
  getSideUnitIconClass,
} from "@/components/empire/shared/domainStyles";
import { ImprovementIcon } from "@/components/empire/shared/ImprovementIcon";
import { UnitTypeIcon } from "@/components/empire/shared/UnitTypeIcon";
import {
  getPreferredDisplayUnitAt,
  getRemainingMove,
  getUnitStats,
  getUnitsAt,
  isUnitConcealedFromSide,
  getTileLabel,
} from "@/lib/empire/game";
import type { Faction, ReachableMove, Tile, Unit } from "@/lib/empire/types";

function CityIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 324 326" className={className} aria-hidden="true">
      <g transform="translate(0,326) scale(0.1,-0.1)" fill="currentColor" stroke="none">
        <path d="M265 3078 c-3 -7 -4 -634 -3 -1393 l3 -1380 180 -3 c99 -1 190 0 203 3 l22 5 0 385 0 385 285 0 c157 0 286 -1 287 -2 1 -2 5 -176 8 -388 l5 -385 189 -3 c105 -1 194 2 199 7 10 10 12 2755 2 2771 -10 16 -1374 13 -1380 -2z m515 -403 l0 -106 -102 3 -103 3 -3 103 -3 102 106 0 105 0 0 -105z m558 3 l-3 -103 -100 0 -100 0 -3 103 -3 102 106 0 106 0 -3 -102z m-563 -578 l0 -105 -80 -3 c-130 -5 -125 -9 -125 107 0 70 4 101 13 105 6 2 53 4 102 3 l90 -2 0 -105z m553 102 c9 -6 12 -35 10 -108 l-3 -99 -100 0 -100 0 -3 94 c-1 52 -1 100 2 108 6 15 171 19 194 5z m-550 -679 l3 -102 -28 -3 c-15 -2 -63 -2 -105 0 l-78 4 0 97 c0 54 3 101 7 105 4 4 50 5 103 4 l95 -3 3 -102z m560 0 l3 -103 -106 0 -105 0 0 98 c0 54 3 102 7 106 4 4 50 5 103 4 l95 -3 3 -102z"/>
        <path d="M1766 2041 c-10 -15 -7 -1724 2 -1733 5 -5 278 -7 608 -6 l599 3 0 870 0 870 -602 3 c-364 1 -604 -2 -607 -7z m433 -196 c2 -2 0 -49 -4 -104 l-7 -101 -83 0 c-46 0 -90 3 -99 6 -13 5 -16 23 -16 98 0 51 4 96 9 102 9 8 191 7 200 -1z m551 -100 l0 -106 -97 3 -98 3 -8 89 c-4 49 -6 95 -3 103 4 10 31 13 106 13 l100 0 0 -105z m-566 -471 c24 -9 24 -199 0 -208 -26 -10 -182 -7 -189 4 -12 20 -6 193 7 202 15 9 159 11 182 2z m568 -70 c3 -42 2 -90 -1 -107 l-7 -32 -93 0 c-74 0 -96 3 -104 16 -6 9 -7 49 -2 102 l7 86 46 4 c26 2 70 4 98 5 l51 2 5 -76z m-557 -609 l0 -100 -102 -3 -103 -3 0 106 0 106 103 -3 102 -3 0 -100z m555 10 c0 -52 0 -98 0 -102 0 -5 -46 -8 -102 -8 l-103 0 -3 94 c-2 69 1 97 10 103 7 4 55 8 106 8 l92 0 0 -95z"/>
        <path d="M74 186 c-3 -7 -4 -40 -2 -72 l3 -59 1548 -3 1548 -2 -3 72 -3 73 -1543 3 c-1296 2 -1543 0 -1548 -12z"/>
      </g>
    </svg>
  );
}

function terrainClass(tile: Tile) {
  if (tile.terrain === "water") return "bg-[#244667]";
  if (tile.terrain === "mountain") return "bg-[#6b7280]";
  return "bg-[#6f7a4b]";
}

function TerrainPattern({ tile }: { tile: Tile }) {
  if (tile.terrain === "water") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-48">
        <span
          className="water-wave absolute left-[10%] top-[22%] h-[2px] w-[38%] rounded-full bg-slate-100/24"
          style={{ animationDelay: "-0.2s", animationDuration: "2.8s" }}
        />
        <span
          className="water-wave absolute right-[12%] top-[36%] h-[2px] w-[30%] rounded-full bg-slate-100/22"
          style={{ animationDelay: "-1.1s", animationDuration: "3.1s" }}
        />
        <span
          className="water-wave absolute left-[18%] top-[56%] h-[2px] w-[44%] rounded-full bg-slate-100/20"
          style={{ animationDelay: "-0.6s", animationDuration: "3.4s" }}
        />
        <span
          className="water-wave absolute right-[18%] top-[70%] h-[2px] w-[24%] rounded-full bg-slate-100/18"
          style={{ animationDelay: "-1.8s", animationDuration: "2.6s" }}
        />
      </div>
    );
  }

  if (tile.terrain === "mountain") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-65">
        <span
          className="absolute left-[16%] bottom-[22%] h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-slate-300/85"
          style={{ borderTopWidth: 0 }}
        />
        <span
          className="absolute left-[38%] bottom-[28%] h-0 w-0 border-x-[7px] border-b-[12px] border-x-transparent border-b-slate-200/85"
          style={{ borderTopWidth: 0 }}
        />
        <span
          className="absolute left-[60%] bottom-[20%] h-0 w-0 border-x-[6px] border-b-[10px] border-x-transparent border-b-slate-300/80"
          style={{ borderTopWidth: 0 }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
      <span className="absolute left-[18%] top-[24%] h-[2px] w-[2px] rounded-full bg-[#d9cfb4]/55" />
      <span className="absolute left-[34%] top-[44%] h-[2px] w-[2px] rounded-full bg-[#d9cfb4]/55" />
      <span className="absolute left-[60%] top-[28%] h-[2px] w-[2px] rounded-full bg-[#cdbf9c]/50" />
      <span className="absolute left-[72%] top-[60%] h-[2px] w-[2px] rounded-full bg-[#cdbf9c]/50" />
      <span className="absolute left-[46%] top-[68%] h-[2px] w-[2px] rounded-full bg-[#d9cfb4]/55" />
    </div>
  );
}

function BridgeOverlay({
  orientation,
  underConstruction,
  turnsRemaining,
}: {
  orientation: "horizontal" | "vertical";
  underConstruction: boolean;
  turnsRemaining?: number;
}) {
  const vertical = orientation === "vertical";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute inset-[10%] rounded-[20%] border border-stone-300/55 bg-[linear-gradient(135deg,rgba(214,211,209,0.22),rgba(51,65,85,0.92))]" />
      <span className="absolute inset-[14%] rounded-[18%] bg-stone-200/10" />
      <span className="absolute inset-[22%] rounded-[16%] border border-stone-200/45 bg-white/5" />
      <span className="absolute inset-x-[10%] bottom-[10%] h-[24%] rounded-t-[24%] bg-slate-950/24" />
      <span className="absolute inset-x-[20%] top-[18%] h-[10%] rounded-full bg-white/10" />
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full">
        {vertical ? (
          <>
            <path d="M40 0 L60 0 L60 100 L40 100 Z" fill="black" />
            <path d="M30 0 C30 20, 70 20, 70 0 Z" fill="black" />
            <path d="M30 100 C30 80, 70 80, 70 100 Z" fill="black" />
            <circle cx="50" cy="50" r="15" fill="white" />
            <circle cx="50" cy="50" r="10" fill="black" />
          </>
        ) : (
          <>
            <path d="M0 40 L100 40 L100 60 L0 60 Z" fill="black" />
            <path d="M0 30 C20 30, 20 70, 0 70 Z" fill="black" />
            <path d="M100 30 C80 30, 80 70, 100 70 Z" fill="black" />
            <circle cx="50" cy="50" r="15" fill="white" />
            <circle cx="50" cy="50" r="10" fill="black" />
          </>
        )}
      </svg>
      {underConstruction ? (
        <>
          <span className="absolute inset-0 bg-slate-950/22" />
          <span className="absolute inset-x-[18%] top-[18%] border-t-2 border-dashed border-white/80" />
          <span className="absolute inset-x-[18%] top-[72%] border-t-2 border-dashed border-white/70" />
          <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
            <TurnBadge value={turnsRemaining ?? "?"} label="turns" />
          </span>
        </>
      ) : null}
    </div>
  );
}

function TurnBadge({
  value,
  label,
  className = "",
}: {
  value: number | string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex min-w-7 items-center justify-center gap-1 rounded-full border border-white/20 bg-slate-950/88 px-2 py-0.5 text-[10px] font-black text-white shadow-[0_4px_14px_rgba(2,6,23,0.55)] backdrop-blur-sm",
        className,
      ].join(" ")}
    >
      <span>{value}</span>
      {label ? <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-300">{label}</span> : null}
    </span>
  );
}

function ProductionPulseOverlay({
  active,
  tintClass,
}: {
  active: boolean;
  tintClass: string;
}) {
  if (!active) return null;

  return (
    <>
      <span className={`production-pulse absolute inset-[8%] rounded-[22%] ${tintClass} opacity-30`} />
      <span className="production-pulse absolute inset-[2px] rounded-[inherit] border border-white/22 opacity-75" />
    </>
  );
}

function ImprovementTileOverlay({
  improvementType,
  underConstruction,
  turnsRemaining,
  radarActive,
  owner,
  playerFaction,
  aiFaction,
}: {
  improvementType: "port" | "airfield" | "tunnel" | "minefield" | "outpost";
  underConstruction: boolean;
  turnsRemaining?: number;
  radarActive?: boolean;
  owner: Tile["owner"];
  playerFaction: Faction;
  aiFaction: Faction;
}) {
  const visuals = getFactionVisuals(owner);
  const productionPulseTint =
    owner === "player"
      ? "bg-[#a3e635]/35"
      : owner === "ai"
        ? "bg-[#ef4444]/30"
        : "bg-white/20";

  if (improvementType === "airfield") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ProductionPulseOverlay active={underConstruction} tintClass={productionPulseTint} />
        <span className="absolute inset-[10%] rounded-[20%] border" style={visuals.airfieldShellStyle} />
        <span className="absolute inset-[14%] rounded-[18%]" style={visuals.glowStyle} />
        <span className="absolute inset-[22%] rounded-[16%] border" style={visuals.innerStyle} />
        <span className="absolute inset-x-[10%] bottom-[10%] h-[24%] rounded-t-[24%] bg-slate-950/28" />
        <span className="absolute inset-x-[20%] top-[18%] h-[10%] rounded-full bg-white/10" />
        <span className="absolute inset-x-[28%] top-[28%] h-[50%] rounded-[20%] bg-slate-950/26 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" />
        <span className="absolute inset-x-[34%] top-[32%] h-[42%] rounded-[18%] bg-slate-800/35" />
        <span className="absolute left-[48.5%] top-[34%] h-[38%] w-[3%] rounded-full bg-white/28" />
        <span className="absolute left-[26%] top-[44%] h-[6%] w-[48%] rounded-full bg-white/10" />
        <span className="absolute left-[32%] top-[58%] h-[5%] w-[36%] rounded-full bg-white/8" />
        <svg viewBox="0 0 250 249" className={`absolute inset-[10%] h-[80%] w-[80%] ${unitOwnerColor(owner, playerFaction, aiFaction)}`}>
          <g transform="translate(0,249) scale(0.1,-0.1)" fill="currentColor" stroke="none">
            <path d="M1157 2483 c-4 -3 -7 -48 -7 -98 l0 -92 -61 -23 c-65 -23 -134 -79 -169 -135 -11 -17 -26 -59 -33 -91 l-14 -59 -384 0 -384 0 -3 35 c-5 45 -18 60 -51 60 -44 0 -51 -16 -51 -116 l0 -91 113 -17 c61 -9 133 -21 158 -27 l47 -10 -5 -39 c-5 -35 -2 -43 30 -75 28 -28 43 -35 75 -35 49 0 78 22 97 75 7 22 19 39 27 38 7 -1 74 -11 148 -23 133 -22 135 -23 150 -54 20 -41 60 -47 86 -13 l19 24 100 -16 100 -17 3 -52 c3 -45 7 -55 27 -64 19 -9 29 -7 49 5 20 13 26 27 28 64 l3 48 95 16 95 16 18 -24 c32 -40 89 -28 99 22 3 17 21 23 128 42 69 12 137 24 151 27 23 4 27 1 38 -34 24 -82 115 -108 173 -50 26 26 30 36 26 75 -4 52 -24 44 192 79 l125 21 3 79 c3 89 -12 126 -53 126 -33 0 -55 -26 -55 -66 l0 -34 -389 0 -389 0 -7 47 c-15 105 -90 197 -191 238 l-59 24 -3 78 c-3 118 -6 123 -51 123 -21 0 -41 -3 -44 -7z m181 -415 c19 -19 15 -66 -8 -78 -12 -6 -69 -9 -142 -8 -121 3 -122 3 -137 30 -14 24 -14 28 3 47 17 19 30 21 146 21 85 0 130 -4 138 -12z" />
            <path d="M676 1257 c-26 -50 -92 -173 -146 -272 -53 -99 -132 -245 -175 -325 -43 -80 -123 -228 -178 -330 -54 -102 -117 -218 -138 -257 l-40 -73 576 0 575 0 0 155 0 155 50 0 50 0 0 -155 0 -155 570 0 c314 0 570 3 570 7 0 4 -50 100 -111 213 -170 312 -232 426 -287 530 -28 52 -112 208 -186 345 l-134 250 -211 3 -211 2 0 -100 0 -100 -50 0 -50 0 0 100 0 100 -212 0 -213 0 -49 -93z m574 -527 l0 -210 -50 0 -50 0 0 210 0 210 50 0 50 0 0 -210z" />
          </g>
        </svg>
        {radarActive ? (
          <>
            <span className="absolute left-[64%] top-[18%] h-[18%] w-[18%] rounded-full border-[2px]" style={visuals.radarBorderStyle} />
            <span className="absolute left-[70%] top-[34%] h-[20%] w-[4%] rounded-full" style={visuals.radarFillStyle} />
            <span className="absolute left-[56%] top-[10%] h-[34%] w-[34%] rounded-full border-[2px] border-b-transparent border-l-transparent" style={visuals.radarBorderStyle} />
          </>
        ) : null}
        {underConstruction ? (
          <>
            <span className="absolute inset-0 bg-slate-950/22" />
            <span className="absolute inset-x-[18%] top-[18%] border-t-2 border-dashed border-white/80" />
            <span className="absolute inset-x-[18%] top-[72%] border-t-2 border-dashed border-white/70" />
            <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
              <TurnBadge value={turnsRemaining ?? "?"} />
            </span>
          </>
        ) : null}
      </div>
    );
  }

  if (improvementType === "port") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ProductionPulseOverlay active={underConstruction} tintClass={productionPulseTint} />
        <span className="absolute inset-[10%] rounded-[20%] border" style={visuals.portShellStyle} />
        <span className="absolute inset-x-[8%] bottom-[10%] h-[24%] rounded-t-[24%] bg-slate-950/32" />
        <svg viewBox="0 0 350 350" className={`absolute inset-[10%] h-[80%] w-[80%] ${ownerPrimaryColor(owner)}`}>
          <g transform="translate(0,350) scale(0.05,-0.05)" fill="currentColor" stroke="none">
            <path d="M1829 5750 c-402 -202 -143 -831 277 -671 42 15 59 7 126 -61 82 -84 80 -140 -4 -155 -51 -9 -228 -183 -228 -224 0 -18 -18 -49 -40 -69 -53 -48 -51 -93 6 -147 58 -54 117 -55 164 -3 19 21 42 35 49 30 23 -13 231 188 231 224 0 125 69 76 370 -264 59 -66 188 -204 288 -306 100 -102 184 -193 188 -202 6 -17 -951 -965 -1217 -1205 -309 -279 -571 -257 -779 66 -157 242 -181 659 -31 518 60 -56 56 -65 110 228 49 265 65 250 -173 165 -301 -108 -277 -91 -215 -155 l54 -56 -43 -61 c-183 -257 -172 -518 38 -912 112 -209 204 -462 250 -683 36 -176 38 -178 173 -195 185 -25 448 -114 687 -232 446 -221 693 -232 934 -39 l73 59 50 -64 50 -63 28 68 c53 128 139 401 129 411 -19 19 -474 -80 -474 -103 0 -13 18 -39 40 -59 61 -56 21 -77 -145 -77 -410 0 -754 372 -626 678 34 80 237 311 729 829 194 204 405 426 471 495 65 69 124 125 132 125 15 0 863 -890 1126 -1184 96 -106 187 -225 204 -264 128 -307 -215 -679 -626 -679 -166 0 -206 21 -145 77 22 20 40 46 40 59 0 23 -455 122 -474 103 -13 -13 132 -449 154 -462 9 -6 36 17 60 50 l43 61 77 -61 c235 -186 522 -177 910 31 240 128 387 176 802 260 35 7 48 37 77 172 53 245 137 477 248 682 214 398 225 659 41 917 l-43 61 54 56 53 56 -231 85 c-127 48 -235 83 -239 78 -8 -8 61 -423 79 -476 8 -22 20 -19 56 15 65 62 90 53 97 -32 37 -445 -331 -843 -667 -721 -108 39 -1469 1331 -1452 1379 3 8 86 99 186 201 100 102 270 285 379 406 110 121 206 223 215 227 25 10 76 -39 63 -61 -13 -21 213 -238 234 -225 7 5 29 -10 48 -31 48 -53 113 -50 167 6 54 58 55 97 3 144 -22 20 -40 51 -40 69 0 41 -181 221 -223 221 -17 0 -46 16 -64 36 -45 50 110 211 177 183 281 -115 583 202 463 487 -175 416 -801 202 -691 -237 34 -132 -138 -284 -194 -172 -36 71 -212 243 -249 243 -18 0 -49 18 -69 40 -100 111 -243 -47 -150 -165 22 -28 40 -59 40 -68 0 -31 206 -224 229 -214 14 5 37 -6 51 -23 30 -36 -754 -820 -820 -820 -64 0 -850 784 -821 819 14 17 34 25 45 18 22 -13 236 189 236 224 0 13 18 44 40 69 96 111 -52 269 -150 160 -20 -22 -51 -40 -69 -40 -37 0 -213 -172 -249 -243 -30 -62 -48 -59 -140 16 l-77 63 24 100 c74 309 -229 555 -510 414z m245 -99 c183 -53 194 -368 15 -443 -270 -113 -488 257 -244 417 79 52 122 56 229 26z m3098 -33 c188 -155 37 -474 -203 -429 -177 33 -254 251 -137 389 81 96 249 116 340 40z" />
          </g>
        </svg>
        {underConstruction ? (
          <>
            <span className="absolute inset-0 bg-slate-950/22" />
            <span className="absolute inset-x-[18%] top-[18%] border-t-2 border-dashed border-white/80" />
            <span className="absolute inset-x-[18%] top-[72%] border-t-2 border-dashed border-white/70" />
            <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
              <TurnBadge value={turnsRemaining ?? "?"} />
            </span>
          </>
        ) : null}
      </div>
    );
  }

  if (improvementType === "minefield") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ProductionPulseOverlay active={underConstruction} tintClass={productionPulseTint} />
        <span className="absolute inset-[10%] rounded-[20%] border border-red-400/40 bg-[linear-gradient(135deg,rgba(127,29,29,0.32),rgba(52,21,21,0.88))]" />
        <span className="absolute inset-[14%] rounded-[18%] bg-red-900/14" />
        <span className="absolute inset-[22%] rounded-[16%] border border-red-300/30 bg-red-950/10" />
        <svg viewBox="0 0 100 100" className="absolute inset-[10%] h-[80%] w-[80%] text-red-200/80">
          <circle cx="25" cy="35" r="10" fill="currentColor" />
          <circle cx="50" cy="55" r="10" fill="currentColor" />
          <circle cx="75" cy="35" r="10" fill="currentColor" />
          <line x1="25" y1="25" x2="25" y2="15" stroke="currentColor" strokeWidth="3" />
          <line x1="50" y1="45" x2="50" y2="35" stroke="currentColor" strokeWidth="3" />
          <line x1="75" y1="25" x2="75" y2="15" stroke="currentColor" strokeWidth="3" />
          <line x1="18" y1="28" x2="12" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="32" y1="28" x2="38" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="43" y1="48" x2="37" y2="40" stroke="currentColor" strokeWidth="2" />
          <line x1="57" y1="48" x2="63" y2="40" stroke="currentColor" strokeWidth="2" />
          <line x1="68" y1="28" x2="62" y2="20" stroke="currentColor" strokeWidth="2" />
          <line x1="82" y1="28" x2="88" y2="20" stroke="currentColor" strokeWidth="2" />
        </svg>
        {underConstruction ? (
          <>
            <span className="absolute inset-0 bg-slate-950/22" />
            <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
              <TurnBadge value={turnsRemaining ?? "?"} />
            </span>
          </>
        ) : null}
      </div>
    );
  }

  if (improvementType === "outpost") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <ProductionPulseOverlay active={underConstruction} tintClass={productionPulseTint} />
        <span className="absolute inset-[10%] rounded-[20%] border" style={visuals.airfieldShellStyle} />
        <span className="absolute inset-[14%] rounded-[18%]" style={visuals.glowStyle} />
        <span className="absolute inset-[22%] rounded-[16%] border" style={visuals.innerStyle} />
        <span className="absolute inset-[18%] flex items-center justify-center text-white/85">
          <span className="relative block h-[70%] w-[70%]">
            <span className="absolute left-[44%] top-[14%] h-[44%] w-[12%] rounded-sm bg-current" />
            <span className="absolute left-[28%] top-[28%] h-[6%] w-[16%] rounded-sm bg-current" />
            <span className="absolute right-[28%] top-[28%] h-[6%] w-[16%] rounded-sm bg-current" />
            <span className="absolute left-[32%] top-[56%] h-[8%] w-[36%] rounded-sm bg-current" />
            <span className="absolute left-[20%] top-[68%] h-[10%] w-[60%] rounded-sm bg-current" />
          </span>
        </span>
        {underConstruction ? (
          <>
            <span className="absolute inset-0 bg-slate-950/22" />
            <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
              <TurnBadge value={turnsRemaining ?? "?"} />
            </span>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <ProductionPulseOverlay active={underConstruction} tintClass={productionPulseTint} />
      <span className="absolute inset-[10%] rounded-[20%] border border-stone-300/55 bg-[linear-gradient(135deg,rgba(214,211,209,0.26),rgba(68,64,60,0.94))]" />
      <span className="absolute inset-[14%] rounded-[18%] bg-stone-200/12" />
      <span className="absolute inset-[22%] rounded-[16%] border border-stone-200/45 bg-white/5" />
      <span className="absolute inset-x-[10%] bottom-[10%] h-[24%] rounded-t-[24%] bg-slate-950/28" />
      <span className="absolute inset-x-[20%] top-[18%] h-[10%] rounded-full bg-white/10" />
      <svg viewBox="0 0 369 412" className="absolute inset-[10%] h-[80%] w-[80%] text-stone-100/85">
        <g transform="translate(0,412) scale(0.05,-0.05)" fill="currentColor" stroke="none">
          <path d="M3330 8027 c-1639 -203 -2778 -1256 -3144 -2907 -30 -134 -34 -396 -40 -2437 l-7 -2288 85 50 c47 28 140 80 206 116 66 36 145 83 175 104 l55 38 0 2004 c0 2112 3 2194 94 2543 440 1692 2200 2659 3836 2108 922 -311 1673 -1093 1931 -2011 113 -405 106 -247 118 -2535 l11 -2119 239 -136 c131 -76 246 -137 255 -137 38 0 9 4515 -31 4700 -392 1846 -2051 3121 -3783 2907z" />
          <path d="M3271 7130 c-1125 -184 -1976 -1007 -2214 -2143 -51 -239 -87 -4101 -39 -4084 11 4 429 241 930 527 l911 520 1 621 c0 825 24 936 247 1158 417 415 1101 236 1299 -338 12 -35 26 -356 33 -750 l11 -689 570 -326 c1109 -634 1237 -706 1259 -706 51 0 17 3814 -35 4066 -297 1413 -1617 2365 -2973 2144z" />
          <path d="M1710 1104 c-660 -437 -1242 -822 -1294 -855 -52 -32 -95 -66 -95 -74 -1 -8 700 -15 1557 -15 l1557 0 13 105 c7 58 30 308 52 555 22 248 54 584 70 748 17 164 30 305 30 315 0 9 -155 17 -345 17 l-345 0 -1200 -796z" />
          <path d="M3700 1886 c0 -8 23 -253 50 -545 28 -292 59 -634 71 -761 12 -126 26 -273 33 -325 l11 -95 1558 0 c1400 0 1632 7 1532 45 -14 6 -596 389 -1295 852 l-1270 843 -345 0 c-190 0 -345 -6 -345 -14z" />
        </g>
      </svg>
      {underConstruction ? (
        <>
          <span className="absolute inset-0 bg-slate-950/22" />
          <span className="absolute inset-x-0 bottom-[10%] flex justify-center">
              <TurnBadge value={turnsRemaining ?? "?"} />
          </span>
        </>
      ) : null}
    </div>
  );
}

function unitOwnerColor(owner: Tile["owner"], playerFaction: Faction, aiFaction: Faction) {
  const displayOption = getDisplayFactionOption(playerFaction, aiFaction, owner);
  if (displayOption) return displayOption.tertiaryClass;
  return "text-white";
}

function ownerPrimaryColor(owner: Tile["owner"]) {
  const displayOption = getSideDisplayOption(owner);
  if (displayOption) return displayOption.primaryClass;
  return "text-white";
}

function ownerRingClass(unit: Unit) {
  const displayOption = getSideDisplayOption(unit.owner);
  return displayOption ? `ring-2 ${displayOption.ringClass}` : "ring-2 ring-white border-slate-300/30";
}

function getFactionVisuals(owner: Tile["owner"]) {
  const option = getSideDisplayOption(owner);
  if (!option) {
    return {
      glowStyle: { backgroundColor: "rgba(241,245,249,0.16)" },
      innerStyle: { borderColor: "rgba(241,245,249,0.65)", backgroundColor: "rgba(255,255,255,0.10)" },
      portShellStyle: { borderColor: "rgba(255,255,255,0.65)", backgroundImage: "linear-gradient(135deg,rgba(148,163,184,0.24),rgba(15,39,72,0.94))" },
      airfieldShellStyle: { borderColor: "rgba(255,255,255,0.65)", backgroundImage: "linear-gradient(135deg,rgba(148,163,184,0.32),rgba(95,118,143,0.92))" },
      radarBorderStyle: { borderColor: "rgba(207,250,254,0.9)" },
      radarFillStyle: { backgroundColor: "rgba(207,250,254,0.9)" },
      contrastPlateClass: "bg-black/70",
      moveRingStyle: { "--tw-ring-color": "rgba(226,232,240,0.9)" } as CSSProperties,
      moveBadgeStyle: { backgroundColor: "rgba(226,232,240,0.9)", color: "rgb(2,6,23)" },
    };
  }

  const primary = option.primaryClass;
  const secondary = option.secondaryClass;
  const tertiary = option.tertiaryClass;
  const primaryHex = primary.match(/\[#([^\]]+)\]/)?.[1] ?? "cbd5e1";
  const secondaryHex = secondary.match(/\[#([^\]]+)\]/)?.[1] ?? "ffffff";
  const tertiaryHex = tertiary.match(/\[#([^\]]+)\]/)?.[1] ?? "ffffff";
  const primaryBright = primary.includes("text-white") || primary.includes("text-[#facc15]") || primary.includes("text-[#ffd400]");
  const secondaryBorder = secondary.includes("text-white") ? "rgba(255,255,255,0.72)" : hexToRgba(secondaryHex, 0.72);
  const secondaryInnerBorder = secondary.includes("text-white") ? "rgba(255,255,255,0.7)" : hexToRgba(secondaryHex, 0.65);
  const tertiaryFill = tertiary.includes("text-white") ? "rgba(255,255,255,0.88)" : hexToRgba(tertiaryHex, 0.88);
  const moveBadgeUsesLightBackground = primaryBright || isLightColor(secondaryHex);
  const moveBadgeBackgroundColor = moveBadgeUsesLightBackground ? "rgba(241,245,249,0.95)" : hexToRgba(secondaryHex, 0.9);
  const moveBadgeTextColor = moveBadgeUsesLightBackground ? "rgb(2,6,23)" : "rgb(248,250,252)";

  return {
    glowStyle: { backgroundColor: primary.includes("text-white") ? "rgba(255,255,255,0.16)" : hexToRgba(primaryHex, 0.16) },
    innerStyle: { borderColor: secondaryInnerBorder, backgroundColor: secondary.includes("text-white") ? "rgba(255,255,255,0.10)" : hexToRgba(secondaryHex, 0.12) },
    portShellStyle: { borderColor: secondaryBorder, backgroundImage: `linear-gradient(135deg,${hexToRgba(primaryHex, 0.24)},rgba(15,39,72,0.96))` },
    airfieldShellStyle: { borderColor: secondaryBorder, backgroundImage: `linear-gradient(135deg,${hexToRgba(primaryHex, 0.32)},rgba(95,118,143,0.94))` },
    radarBorderStyle: { borderColor: secondary.includes("text-white") ? "rgba(255,255,255,0.88)" : hexToRgba(secondaryHex, 0.88) },
    radarFillStyle: { backgroundColor: tertiaryFill },
    contrastPlateClass: primaryBright ? "bg-black/82" : "bg-white/88",
    moveRingStyle: { "--tw-ring-color": secondary.includes("text-white") ? "rgba(255,255,255,0.9)" : hexToRgba(secondaryHex, 0.9) } as CSSProperties,
    moveBadgeStyle: { backgroundColor: moveBadgeBackgroundColor, color: moveBadgeTextColor },
  };
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function isLightColor(hex: string) {
  const normalized = hex.length === 3 ? hex.split("").map((char) => char + char).join("") : hex;
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  const luminance = (r * 299 + g * 587 + b * 114) / 1000;
  return luminance >= 160;
}

function CityTileOverlay({
  owner,
}: {
  owner: Tile["owner"];
}) {
  const visuals = getFactionVisuals(owner);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className="absolute inset-[10%] rounded-[20%] border" style={visuals.portShellStyle} />
      <span className="absolute inset-[14%] rounded-[18%]" style={visuals.glowStyle} />
      <span className="absolute inset-[22%] rounded-[16%] border" style={visuals.innerStyle} />
      <span className="absolute inset-x-[10%] bottom-[10%] h-[24%] rounded-t-[24%] bg-slate-950/32" />
      <span className="absolute inset-x-[20%] top-[18%] h-[10%] rounded-full bg-white/10" />
    </div>
  );
}

type MapTileProps = {
  tile: Tile;
  intelTile: Tile | null;
  visible: boolean;
  units: Unit[];
  selectedUnit: Unit | null;
  playerFaction: Faction;
  aiFaction: Faction;
  selectedCity: { x: number; y: number } | null;
  highlightOrderSignal: number;
  highlightPendingOrder: boolean;
  bridgeBuildTarget: boolean;
  bridgeOrientation: "horizontal" | "vertical" | null;
  moveData?: ReachableMove;
  canInteract: boolean;
  onClick: (x: number, y: number, target?: TileClickTarget) => void;
  onRightClick?: (x: number, y: number, target?: TileClickTarget) => void;
};

export function MapTile({
  tile,
  intelTile,
  visible,
  units,
  selectedUnit,
  playerFaction,
  aiFaction,
  selectedCity,
  highlightOrderSignal,
  highlightPendingOrder,
  bridgeBuildTarget,
  bridgeOrientation,
  moveData,
  canInteract,
  onClick,
  onRightClick,
}: MapTileProps) {
  const playerFactionStyle = getFactionVisuals("player");
  const displayTile = visible ? tile : intelTile;
  const visibleOccupants = visible
    ? getUnitsAt(units, tile.x, tile.y).filter((unit) => !isUnitConcealedFromSide(unit, "player"))
    : [];
  const surfaceOccupants = visibleOccupants.filter((unit) => getUnitStats(unit).domain !== "air");
  const airOccupants = visibleOccupants.filter((unit) => getUnitStats(unit).domain === "air");
  const surfaceOccupant = surfaceOccupants[0] ?? null;
  const airOccupant = airOccupants[0] ?? null;
  const hasSharedUnitStack = Boolean(surfaceOccupant && airOccupant);
  const occupant = getPreferredDisplayUnitAt(visibleOccupants, tile.x, tile.y);
  const isSelected = selectedUnit?.x === tile.x && selectedUnit?.y === tile.y;
  const isSelectedCity = selectedCity?.x === tile.x && selectedCity?.y === tile.y;
  const isMove = !!moveData;
  const isUnseen = !displayTile;
  const stale = !!displayTile && !visible;
  const hasPendingOrderHighlight = highlightPendingOrder && highlightOrderSignal > 0;
  const tileLabel = isUnseen ? "Unexplored" : getTileLabel(displayTile);
  const improvementType = displayTile?.improvement?.type ?? displayTile?.improvementProject?.type ?? null;
  const siteType = displayTile?.city ? "city" : displayTile?.improvement?.type === "port" || displayTile?.improvement?.type === "airfield" ? displayTile.improvement.type : null;
  const showImprovementTileOverlay =
    improvementType === "port" || improvementType === "airfield" || improvementType === "tunnel" || improvementType === "minefield" || improvementType === "outpost";
  const hasSpecialTileBackdrop = Boolean(displayTile?.city || displayTile?.improvement || displayTile?.improvementProject);
  const productionSiteOwner = displayTile?.improvement?.owner ?? displayTile?.owner ?? null;
  const radarActive =
    (displayTile?.improvement?.type === "airfield" && Boolean(displayTile.improvement.hasRadar)) ||
    displayTile?.improvementProject?.type === "radar";
  const productionTurnsRemaining = displayTile?.production?.turnsRemaining ?? null;
  const producedUnitType = displayTile?.production?.unitType ?? null;
  const isProducingUnit = Boolean(displayTile?.production && producedUnitType);
  const engineerOnProject = Boolean(
    surfaceOccupant?.type === "engineer" && displayTile?.improvementProject?.engineerUnitId === surfaceOccupant.id
  );
  const showSiteChip = Boolean(siteType && (surfaceOccupant || airOccupant));
  const productionPulseClass =
    productionSiteOwner === "player"
      ? "bg-[#a3e635]/24"
      : productionSiteOwner === "ai"
        ? "bg-[#ef4444]/24"
        : "bg-white/20";

  function handleTargetClick(event: MouseEvent, target: TileClickTarget) {
    event.stopPropagation();
    onClick(tile.x, tile.y, target);
  }

  function handleTargetContextMenu(event: MouseEvent, target: TileClickTarget) {
    event.preventDefault();
    event.stopPropagation();
    onRightClick?.(tile.x, tile.y, target);
  }

  return (
    <button
      onClick={() => onClick(tile.x, tile.y, "tile")}
      onContextMenu={(event) => {
        event.preventDefault();
        onRightClick?.(tile.x, tile.y, "tile");
      }}
      className={[
        "h-full w-full rounded-xl border text-xs relative transition-all duration-150",
        isUnseen ? "bg-slate-950/95" : terrainClass(displayTile),
        isSelected ? "border-white scale-[1.03]" : isSelectedCity ? "border-[#a3e635] scale-[1.03]" : "border-slate-900/70",
        isMove ? "ring-2" : "",
        bridgeBuildTarget ? "ring-2 ring-[#a3e635]/90 shadow-[0_0_16px_rgba(163,230,53,0.35)]" : "",
        hasPendingOrderHighlight
          ? "ring-[5px] ring-[#d9f99d] shadow-[0_0_0_2px_rgba(132,204,22,0.4),0_0_28px_rgba(190,242,100,0.65)] animate-[pulse_0.9s_ease-in-out_infinite]"
          : "",
        stale ? "brightness-50 saturate-50" : "",
        canInteract && visible ? "hover:brightness-110" : "cursor-default",
      ].join(" ")}
      style={isMove ? playerFactionStyle.moveRingStyle : undefined}
      title={`${tileLabel} (${tile.x + 1}, ${tile.y + 1})`}
      type="button"
    >
      {isUnseen && <div className="absolute inset-0 bg-black/70" />}
      {displayTile && <TerrainPattern tile={displayTile} />}
      {displayTile?.city ? <CityTileOverlay owner={displayTile.owner} /> : null}
      {isProducingUnit ? <ProductionPulseOverlay active={true} tintClass={productionPulseClass} /> : null}
      {displayTile && bridgeOrientation ? (
        <BridgeOverlay
          orientation={bridgeOrientation}
          underConstruction={Boolean(displayTile.improvementProject?.type === "bridge")}
          turnsRemaining={displayTile.improvementProject?.turnsRemaining}
        />
      ) : null}
      {displayTile && showImprovementTileOverlay ? (
        <ImprovementTileOverlay
          improvementType={improvementType}
          underConstruction={Boolean(displayTile.improvementProject)}
          turnsRemaining={displayTile.improvementProject?.turnsRemaining}
          radarActive={radarActive}
          owner={displayTile.improvement?.owner ?? displayTile.improvementProject?.owner ?? displayTile.owner}
          playerFaction={playerFaction}
          aiFaction={aiFaction}
        />
      ) : null}
      <div className="absolute inset-0 z-10 flex items-center justify-center">
        {showSiteChip ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => handleTargetClick(event, "site")}
            onContextMenu={(event) => handleTargetContextMenu(event, "site")}
            className="absolute left-1 top-1 z-20 flex h-[28%] w-[28%] min-h-4 min-w-4 max-h-7 max-w-7 items-center justify-center rounded-md border border-slate-950/40 bg-slate-950/72 shadow-md cursor-pointer"
          >
            <span
              className={[
                "absolute inset-[10%] rounded-md shadow-sm",
                getFactionVisuals(displayTile?.improvement?.owner ?? displayTile?.owner ?? null).contrastPlateClass,
              ].join(" ")}
            />
            {siteType === "city" ? (
              <CityIcon className={`h-full w-full drop-shadow-sm ${ownerPrimaryColor(displayTile?.owner ?? null)}`} />
            ) : (
              <span className={`relative z-10 ${ownerPrimaryColor(displayTile?.improvement?.owner ?? displayTile?.owner ?? null)}`}>
                <ImprovementIcon improvementType={siteType as "port" | "airfield"} />
              </span>
            )}
          </span>
        ) : displayTile?.city ? (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => handleTargetClick(event, "site")}
            onContextMenu={(event) => handleTargetContextMenu(event, "site")}
            className="flex h-[46%] w-[46%] min-h-5 min-w-5 max-h-9 max-w-9 items-center justify-center cursor-pointer"
          >
            <span
              className={[
                "absolute inset-[16%] rounded-md shadow-sm",
                getFactionVisuals(displayTile.owner).contrastPlateClass,
              ].join(" ")}
            />
            <CityIcon className={`h-full w-full drop-shadow-sm ${ownerPrimaryColor(displayTile.owner)}`} />
          </span>
        ) : null}
        {(displayTile?.improvement || displayTile?.improvementProject) &&
        (displayTile.improvement?.type ?? displayTile.improvementProject?.type) !== "bridge" &&
        !showImprovementTileOverlay && (
          <span className="absolute bottom-1 left-1 z-20 flex h-[28%] w-[28%] min-h-4 min-w-4 max-h-7 max-w-7 items-center justify-center rounded-md border border-slate-950/40 bg-slate-950/65 shadow-md">
            <span className={displayTile?.improvementProject ? "opacity-70" : ""}>
              <ImprovementIcon improvementType={(displayTile?.improvement?.type ?? displayTile?.improvementProject?.type)!} />
            </span>
            {displayTile?.improvement?.type === "outpost" ? (
              <span className="absolute -top-2 left-1/2 -translate-x-1/2">
                <TurnBadge value={displayTile.improvement.hp ?? displayTile.improvement.maxHp ?? 12} className="px-1.5 py-0" />
              </span>
            ) : null}
            {displayTile?.improvementProject && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2">
                <TurnBadge value={displayTile.improvementProject.turnsRemaining} />
              </span>
            )}
          </span>
        )}
        {isProducingUnit && producedUnitType ? (
          <span className="absolute bottom-1 left-1 z-20 flex items-center gap-1 rounded-full border border-cyan-200/20 bg-slate-950/84 px-1.5 py-1 text-white shadow-lg backdrop-blur-sm">
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full border border-slate-900/20 shadow-sm",
                getSideUnitBadgeClass(
                  producedUnitType,
                  getUnitStats({
                    id: -1,
                    owner: (productionSiteOwner ?? "player") as Unit["owner"],
                    type: producedUnitType,
                    x: tile.x,
                    y: tile.y,
                    hp: 1,
                    moveSpent: 0,
                    fortified: false, entrenched: false,
                    sentry: false,
                    concealed: false,
                    turnsAwayFromBase: 0,
                  }).domain,
                  playerFaction,
                  aiFaction,
                  (productionSiteOwner ?? "player") as Unit["owner"]
                ),
              ].join(" ")}
              style={getSideUnitBadgeStyle(
                producedUnitType,
                getUnitStats({
                  id: -1,
                  owner: (productionSiteOwner ?? "player") as Unit["owner"],
                  type: producedUnitType,
                  x: tile.x,
                  y: tile.y,
                  hp: 1,
                  moveSpent: 0,
                  fortified: false, entrenched: false,
                  sentry: false,
                  concealed: false,
                  turnsAwayFromBase: 0,
                }).domain,
                playerFaction,
                aiFaction,
                (productionSiteOwner ?? "player") as Unit["owner"]
              )}
            >
              <UnitTypeIcon
                unitType={producedUnitType}
                className={getSideUnitIconClass(
                  playerFaction,
                  aiFaction,
                  (productionSiteOwner ?? "player") as Unit["owner"]
                )}
              />
            </span>
            <TurnBadge value={productionTurnsRemaining ?? "?"} className="px-1.5 py-0" />
          </span>
        ) : null}
        {surfaceOccupant && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => handleTargetClick(event, "surface-unit")}
            onContextMenu={(event) => handleTargetContextMenu(event, "surface-unit")}
            className={[
              hasSharedUnitStack
                ? "absolute bottom-1 right-1 z-20 flex h-[34%] w-[34%] min-h-5 min-w-5 max-h-8 max-w-8 items-center justify-center rounded-full border shadow-md cursor-pointer"
                : hasSpecialTileBackdrop
                  ? "absolute inset-0 z-20 m-auto flex h-[46%] w-[46%] min-h-6 min-w-6 max-h-10 max-w-10 items-center justify-center rounded-full border shadow-lg cursor-pointer"
                  : "absolute inset-0 z-20 m-auto flex h-[56%] w-[56%] min-h-7 min-w-7 max-h-12 max-w-12 items-center justify-center rounded-full border shadow-lg cursor-pointer",
              getSideUnitBadgeClass(
                surfaceOccupant.type,
                getUnitStats(surfaceOccupant).domain,
                playerFaction,
                aiFaction,
                surfaceOccupant.owner
              ),
              ownerRingClass(surfaceOccupant),
              hasPendingOrderHighlight ? "scale-[1.1] ring-[3px] ring-[#ecfccb] shadow-[0_0_22px_rgba(190,242,100,0.8)] animate-[pulse_0.85s_ease-in-out_infinite]" : "",
            ].join(" ")}
            style={getSideUnitBadgeStyle(
              surfaceOccupant.type,
              getUnitStats(surfaceOccupant).domain,
              playerFaction,
              aiFaction,
              surfaceOccupant.owner
            )}
          >
            {engineerOnProject ? (
              <>
                <span className="engineer-build-halo absolute inset-[-12%] rounded-full border border-cyan-200/70 bg-cyan-300/12 shadow-[0_0_12px_rgba(34,211,238,0.35)]" />
                <span className="engineer-build-spark absolute inset-[-22%] rounded-full border border-dashed border-amber-200/50" />
              </>
            ) : null}
            <UnitTypeIcon
              unitType={surfaceOccupant.type}
              className={getSideUnitIconClass(playerFaction, aiFaction, surfaceOccupant.owner)}
            />
            {getRemainingMove(surfaceOccupant) > 0 ? (
              <span className="absolute -top-1 -left-1 rounded-full bg-slate-950/92 px-1 text-[9px] font-bold text-cyan-100 ring-1 ring-cyan-200/35">
                {getRemainingMove(surfaceOccupant)}
              </span>
            ) : null}
            {surfaceOccupants.length > 1 ? (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-950/90 px-1 text-[9px] font-bold text-white">
                {surfaceOccupants.length}
              </span>
            ) : null}
          </span>
        )}
        {airOccupant && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(event) => handleTargetClick(event, "air-unit")}
            onContextMenu={(event) => handleTargetContextMenu(event, "air-unit")}
            className={[
              hasSharedUnitStack
                ? "absolute top-1 right-1 z-20 flex h-[30%] w-[30%] min-h-4 min-w-4 max-h-7 max-w-7 items-center justify-center rounded-full border shadow-md cursor-pointer"
                : hasSpecialTileBackdrop
                  ? "absolute inset-0 z-20 m-auto flex h-[46%] w-[46%] min-h-6 min-w-6 max-h-10 max-w-10 items-center justify-center rounded-full border shadow-lg cursor-pointer"
                  : "absolute inset-0 z-20 m-auto flex h-[56%] w-[56%] min-h-7 min-w-7 max-h-12 max-w-12 items-center justify-center rounded-full border shadow-lg cursor-pointer",
              getSideUnitBadgeClass(
                airOccupant.type,
                getUnitStats(airOccupant).domain,
                playerFaction,
                aiFaction,
                airOccupant.owner
              ),
              ownerRingClass(airOccupant),
              hasPendingOrderHighlight ? "scale-[1.1] ring-[3px] ring-[#ecfccb] shadow-[0_0_22px_rgba(190,242,100,0.8)] animate-[pulse_0.85s_ease-in-out_infinite]" : "",
            ].join(" ")}
            style={getSideUnitBadgeStyle(
              airOccupant.type,
              getUnitStats(airOccupant).domain,
              playerFaction,
              aiFaction,
              airOccupant.owner
            )}
          >
            <UnitTypeIcon
              unitType={airOccupant.type}
              className={getSideUnitIconClass(playerFaction, aiFaction, airOccupant.owner)}
            />
            {getRemainingMove(airOccupant) > 0 ? (
              <span className="absolute -top-1 -left-1 rounded-full bg-slate-950/92 px-1 text-[9px] font-bold text-cyan-100 ring-1 ring-cyan-200/35">
                {getRemainingMove(airOccupant)}
              </span>
            ) : null}
            {airOccupants.length > 1 ? (
              <span className="absolute -bottom-1 -right-1 rounded-full bg-slate-950/90 px-1 text-[9px] font-bold text-white">
                {airOccupants.length}
              </span>
            ) : null}
          </span>
        )}
      </div>
      {occupant && (
        <div className="absolute top-1 left-1 z-30 rounded bg-slate-950/75 px-1 text-[10px] font-bold text-white shadow-sm">
          {occupant.hp}
        </div>
      )}
      {moveData && (
        <div className="absolute top-1 right-1 z-20 rounded px-1 text-[10px] font-bold" style={playerFactionStyle.moveBadgeStyle}>
          {moveData.cost}
        </div>
      )}
    </button>
  );
}
