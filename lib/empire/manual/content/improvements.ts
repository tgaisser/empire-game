import type { ManualImprovementEntry } from "@/lib/empire/manual/types";
import type { TileImprovementType } from "@/lib/empire/types";

export const IMPROVEMENT_MANUAL_ENTRIES: Record<TileImprovementType, ManualImprovementEntry> = {
  bridge: {
    improvementType: "bridge",
    summary: "Temporary-looking infrastructure with strategic importance: it turns blocked crossings into maneuver lanes.",
    whenToBuild: ["Build bridges to accelerate an offensive or to preserve lateral movement across rivers and channels."],
    strengths: ["Lets land units move across otherwise blocked water crossings.", "Creates armor-friendly movement when timing matters."],
    risks: ["Easy to overextend across.", "Engineers and bombers can remove them and collapse your route."],
    related: [
      { kind: "unit", id: "engineer", label: "Engineer", note: "Engineers both create and remove bridges." },
      { kind: "unit", id: "bomber", label: "Bomber", note: "Bombers can cut a bridge without needing a land assault." },
    ],
  },
  port: {
    improvementType: "port",
    summary: "Naval production and embarkation site that ties land operations to sea logistics.",
    whenToBuild: ["Build ports where coastal pressure or transport operations will matter for multiple turns."],
    strengths: ["Produces sea units.", "Supports embarkation and sustainment of invasions."],
    risks: ["A port without sea control is a liability.", "Losing a port can strand your operational plan."],
    related: [
      { kind: "unit", id: "troop-transport", label: "Troop Transport", note: "Transports can embark troops from adjacent coastal tiles, but ports still matter for naval production and safe staging." },
      { kind: "rule", id: "transport-and-escort", label: "Transport And Escort", note: "Ports are the shore-side half of naval logistics." },
    ],
  },
  airfield: {
    improvementType: "airfield",
    summary: "Forward air base and aircraft production site.",
    whenToBuild: ["Build airfields before you commit to repeated air operations over the same region."],
    strengths: ["Produces aircraft.", "Extends legal landing and rearm coverage."],
    risks: ["Airfields become prime targets once bombers appear.", "A forward airfield without defense can be turned against you."],
    related: [
      { kind: "unit", id: "bomber", label: "Bomber", note: "Bombers need airfields for safe recovery and rearm." },
      { kind: "improvement", id: "radar", label: "Radar Upgrade", note: "Radar is the natural upgrade path once the airfield matters." },
    ],
  },
  radar: {
    improvementType: "radar",
    summary: "Airfield upgrade that turns a base into an early-warning node.",
    whenToBuild: ["Build radar where you need stable air warning, especially around fleets, invasion lanes, and bomber corridors."],
    strengths: ["Reveals enemy aircraft through fog within its radius.", "Makes fighters and carrier groups more responsive."],
    risks: ["Requires an existing friendly airfield.", "Static coverage can be bypassed if you rely on it alone."],
    related: [
      { kind: "unit", id: "fighter", label: "Fighter", note: "Fighters get the most direct value from earlier air warning." },
      { kind: "unit", id: "carrier", label: "Carrier", note: "Carriers and radar combine into a stronger air picture than either alone." },
      { kind: "rule", id: "air-basing-and-rearm", label: "Air Basing And Rearm", note: "Radar matters because aircraft need safe, informed basing." },
    ],
  },
  tunnel: {
    improvementType: "tunnel",
    summary: "Permanent route through mountains that changes the land-war geometry.",
    whenToBuild: ["Build tunnels where mountain barriers are throttling your armor or logistics."],
    strengths: ["Lets tanks cross mountain lines.", "Reduces movement friction through the tile."],
    risks: ["The enemy can demolish them if you leave them exposed.", "A tunnel can become a trap if the far side is not secured."],
    related: [
      { kind: "terrain", id: "mountain", label: "Mountain", note: "Tunnels only matter because mountains are real mobility barriers." },
      { kind: "unit", id: "tank", label: "Tank", note: "Tanks gain the most from tunnel access." },
    ],
  },
  outpost: {
    improvementType: "outpost",
    summary: "Forward control point that extends presence and staging beyond cities.",
    whenToBuild: ["Build outposts to anchor pressure in contested ground or to hold a fresh breakthrough."],
    strengths: ["Adds forward map control and support value.", "Useful in areas too distant from cities to hold otherwise."],
    risks: ["Can be isolated and destroyed if unsupported.", "It is an anchor, not a substitute for an army."],
    related: [
      { kind: "unit", id: "infantry", label: "Infantry", note: "Infantry is the natural garrison for forward outposts." },
      { kind: "unit", id: "engineer", label: "Engineer", note: "Engineers are what turn open ground into a defended outpost line." },
    ],
  },
  minefield: {
    improvementType: "minefield",
    summary: "Hidden area-denial trap that punishes careless land movement.",
    whenToBuild: ["Lay minefields on likely approach lanes, flanks, and spots the enemy assumes are routine."],
    strengths: ["Hidden until properly detected.", "Threatens enemy tempo even before it triggers."],
    risks: ["Engineers can detect and disarm them.", "Minefields are strongest when blended with real defenses, not used alone."],
    related: [
      { kind: "unit", id: "engineer", label: "Engineer", note: "Engineers are both the layer and the counter for minefields." },
      { kind: "rule", id: "stealth-and-detection", label: "Stealth And Detection", note: "Minefields matter because detection is conditional, not automatic." },
    ],
  },
};
