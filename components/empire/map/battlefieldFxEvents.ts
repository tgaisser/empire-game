import type { BattlefieldFxEvent } from "@/components/empire/map/BattlefieldFxOverlay";
import type { CombatEventRecord, GameState } from "@/lib/empire/types";

function createCombatFxEvents(event: Extract<CombatEventRecord, { type: "combat" }>, createdAt: number) {
  const attackRole = event.style === "missile" ? "missile" : event.style === "airstrike" ? "airstrike" : "attack";
  const attackTravelMs = event.style === "missile" ? 420 : event.style === "airstrike" ? 300 : 240;
  const attackImpactDelayMs = Math.round(attackTravelMs * 0.72);
  const attackImpactSize = event.style === "missile" ? "large" : "small";

  const events: BattlefieldFxEvent[] = [
    {
      id: `projectile-${event.id}-attack`,
      type: "projectile",
      role: attackRole,
      fromX: event.fromX,
      fromY: event.fromY,
      toX: event.targetX,
      toY: event.targetY,
      createdAt,
      durationMs: attackTravelMs,
      bursts: event.style === "firefight" ? 2 : 1,
    },
    {
      id: `impact-${event.id}-target`,
      type: "impact",
      role: attackRole,
      x: event.targetX,
      y: event.targetY,
      createdAt,
      delayMs: attackImpactDelayMs,
      durationMs: event.style === "missile" ? 980 : 680,
      size: attackImpactSize,
    },
  ];

  if (event.defenderDamage > 0) {
    events.push({
      id: `damage-${event.id}-target`,
      type: "damage",
      role: "attack",
      x: event.targetX,
      y: event.targetY,
      amount: event.defenderDamage,
      createdAt,
      delayMs: attackImpactDelayMs + 50,
      durationMs: 760,
    });
  }

  if (event.counterAttack) {
    const counterCreatedAt = createdAt;
    const counterDelayMs = attackImpactDelayMs + 220;
    events.push(
      {
        id: `projectile-${event.id}-counter`,
        type: "projectile",
        role: "counter",
        fromX: event.targetX,
        fromY: event.targetY,
        toX: event.fromX,
        toY: event.fromY,
        createdAt: counterCreatedAt,
        delayMs: counterDelayMs,
        durationMs: 230,
        bursts: 1,
      },
      {
        id: `impact-${event.id}-attacker`,
        type: "impact",
        role: "counter",
        x: event.fromX,
        y: event.fromY,
        createdAt: counterCreatedAt,
        delayMs: counterDelayMs + 150,
        durationMs: 620,
        size: "small",
      }
    );

    if (event.attackerDamage > 0) {
      events.push({
        id: `damage-${event.id}-attacker`,
        type: "damage",
        role: "counter",
        x: event.fromX,
        y: event.fromY,
        amount: event.attackerDamage,
        createdAt: counterCreatedAt,
        delayMs: counterDelayMs + 190,
        durationMs: 760,
      });
    }
  }

  return events;
}

function createSonarFxEvent(event: Extract<CombatEventRecord, { type: "sonar-ping" }>, createdAt: number): BattlefieldFxEvent {
  return {
    id: `sonar-${event.id}`,
    type: "sonar-ring",
    x: event.x,
    y: event.y,
    radius: event.radius,
    detected: event.detectedSubmarineIds.length > 0,
    createdAt,
    durationMs: 1300,
  };
}

export function createBattlefieldFxEvents(previousGame: GameState, currentGame: GameState) {
  const previousIds = new Set(previousGame.combatEvents.map((event) => event.id));
  const newCombatEvents = currentGame.combatEvents.filter((event) => event.visibleToPlayer && !previousIds.has(event.id));

  return newCombatEvents.flatMap((event, index) => {
    const createdAt = Date.now() + index * 170;
    if (event.type === "sonar-ping") {
      return [createSonarFxEvent(event, createdAt)];
    }
    return createCombatFxEvents(event, createdAt);
  });
}
