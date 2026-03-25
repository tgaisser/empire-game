'use client';

import { useEffect, useRef } from "react";
import type { GameState, Tile, UnitType } from "@/lib/empire/types";

type AudioCue = "combat" | "tankMove" | "portClick" | "airfieldClick" | "deployCampaign" | "endTurnConfirm";

function createNoiseBuffer(context: AudioContext, seconds: number) {
  const frameCount = Math.max(1, Math.floor(context.sampleRate * seconds));
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);

  for (let index = 0; index < frameCount; index += 1) {
    data[index] = (Math.random() * 2 - 1) * (1 - index / frameCount);
  }

  return buffer;
}

export function useEmpireAudio() {
  const contextRef = useRef<AudioContext | null>(null);
  const lastCueTimesRef = useRef<Record<AudioCue, number>>({
    combat: 0,
    tankMove: 0,
    portClick: 0,
    airfieldClick: 0,
    deployCampaign: 0,
    endTurnConfirm: 0,
  });

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
      contextRef.current = null;
    };
  }, []);

  function getContext() {
    if (typeof window === "undefined") return null;
    const AudioContextCtor = window.AudioContext ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!contextRef.current) {
      contextRef.current = new AudioContextCtor();
    }
    if (contextRef.current.state === "suspended") {
      void contextRef.current.resume();
    }
    return contextRef.current;
  }

  function shouldThrottle(cue: AudioCue, minGapMs: number) {
    const now = performance.now();
    const previous = lastCueTimesRef.current[cue];
    if (now - previous < minGapMs) return true;
    lastCueTimesRef.current[cue] = now;
    return false;
  }

  function playCombat() {
    if (shouldThrottle("combat", 220)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(context.destination);

    const noise = context.createBufferSource();
    noise.buffer = createNoiseBuffer(context, 0.28);
    const noiseFilter = context.createBiquadFilter();
    noiseFilter.type = "bandpass";
    noiseFilter.frequency.setValueAtTime(720, now);
    noiseFilter.Q.setValueAtTime(0.8, now);
    noise.connect(noiseFilter);
    noiseFilter.connect(master);
    noise.start(now);
    noise.stop(now + 0.28);

    const boom = context.createOscillator();
    boom.type = "triangle";
    boom.frequency.setValueAtTime(110, now);
    boom.frequency.exponentialRampToValueAtTime(48, now + 0.32);
    const boomGain = context.createGain();
    boomGain.gain.setValueAtTime(0.0001, now);
    boomGain.gain.exponentialRampToValueAtTime(0.2, now + 0.015);
    boomGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
    boom.connect(boomGain);
    boomGain.connect(master);
    boom.start(now);
    boom.stop(now + 0.34);
  }

  function playTankMove() {
    if (shouldThrottle("tankMove", 420)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.12, now + 0.04);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
    master.connect(context.destination);

    const engine = context.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.setValueAtTime(58, now);
    engine.frequency.linearRampToValueAtTime(66, now + 0.62);
    const engineFilter = context.createBiquadFilter();
    engineFilter.type = "lowpass";
    engineFilter.frequency.setValueAtTime(180, now);
    engineFilter.Q.setValueAtTime(1.2, now);
    engine.connect(engineFilter);
    engineFilter.connect(master);
    engine.start(now);
    engine.stop(now + 0.65);

    for (let index = 0; index < 3; index += 1) {
      const pulseTime = now + 0.08 + index * 0.12;
      const pulse = context.createOscillator();
      pulse.type = "square";
      pulse.frequency.setValueAtTime(88 - index * 8, pulseTime);
      const pulseGain = context.createGain();
      pulseGain.gain.setValueAtTime(0.0001, pulseTime);
      pulseGain.gain.exponentialRampToValueAtTime(0.05, pulseTime + 0.01);
      pulseGain.gain.exponentialRampToValueAtTime(0.0001, pulseTime + 0.07);
      pulse.connect(pulseGain);
      pulseGain.connect(master);
      pulse.start(pulseTime);
      pulse.stop(pulseTime + 0.08);
    }
  }

  function playPortClick() {
    if (shouldThrottle("portClick", 180)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.9);
    master.connect(context.destination);

    for (const [offset, frequency, gain] of [
      [0, 784, 0.18],
      [0.02, 1175, 0.12],
      [0.05, 1568, 0.07],
    ] as const) {
      const osc = context.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, now + offset);
      const oscGain = context.createGain();
      oscGain.gain.setValueAtTime(0.0001, now + offset);
      oscGain.gain.exponentialRampToValueAtTime(gain, now + offset + 0.015);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      osc.connect(oscGain);
      oscGain.connect(master);
      osc.start(now + offset);
      osc.stop(now + 1.55);
    }
  }

  function playAirfieldClick() {
    if (shouldThrottle("airfieldClick", 180)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.16, now + 0.05);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.78);
    master.connect(context.destination);

    const engine = context.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.setValueAtTime(140, now);
    engine.frequency.exponentialRampToValueAtTime(420, now + 0.72);
    const engineGain = context.createGain();
    engineGain.gain.setValueAtTime(0.0001, now);
    engineGain.gain.exponentialRampToValueAtTime(0.14, now + 0.08);
    engineGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.72);
    engine.connect(engineGain);
    engineGain.connect(master);
    engine.start(now);
    engine.stop(now + 0.74);

    const wind = context.createBufferSource();
    wind.buffer = createNoiseBuffer(context, 0.75);
    const windFilter = context.createBiquadFilter();
    windFilter.type = "highpass";
    windFilter.frequency.setValueAtTime(800, now);
    const windGain = context.createGain();
    windGain.gain.setValueAtTime(0.0001, now);
    windGain.gain.exponentialRampToValueAtTime(0.06, now + 0.07);
    windGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start(now);
    wind.stop(now + 0.75);
  }

  function playDeployCampaign() {
    if (shouldThrottle("deployCampaign", 500)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.18, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.25);
    master.connect(context.destination);

    const hornFrequencies = [196, 247, 294] as const;
    for (const [index, frequency] of hornFrequencies.entries()) {
      const start = now + index * 0.14;
      const osc = context.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(frequency, start);
      osc.frequency.exponentialRampToValueAtTime(frequency * 0.98, start + 0.22);

      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(920, start);
      filter.Q.setValueAtTime(1.4, start);

      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.11, start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      osc.start(start);
      osc.stop(start + 0.36);
    }
  }

  function playEndTurnConfirm() {
    if (shouldThrottle("endTurnConfirm", 180)) return;
    const context = getContext();
    if (!context) return;

    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.14, now + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);
    master.connect(context.destination);

    for (const [offset, frequency] of [
      [0, 392],
      [0.07, 493.88],
    ] as const) {
      const osc = context.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(frequency, now + offset);
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.12, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.18);
      osc.connect(gain);
      gain.connect(master);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    }
  }

  function playTileClick(tile: Tile | null | undefined) {
    if (!tile) return;
    if (tile.improvement?.type === "port") {
      playPortClick();
      return;
    }
    if (tile.improvement?.type === "airfield") {
      playAirfieldClick();
    }
  }

  function playMovement(units: Array<{ unitType: UnitType }>) {
    if (units.some((unit) => unit.unitType === "tank")) {
      playTankMove();
    }
  }

  function playFromLogDelta(previousGame: GameState, nextGame: GameState) {
    if (previousGame.logs.length >= nextGame.logs.length) return;
    const newMessages = nextGame.logs.slice(previousGame.logs.length);
    if (
      newMessages.some((message) =>
        /battle at|strike at|called in an air strike|target destroyed|captured|destroyed|detonated|jamming attack/i.test(message)
      )
    ) {
      playCombat();
    }
  }

  return {
    playDeployCampaign,
    playEndTurnConfirm,
    playTileClick,
    playMovement,
    playFromLogDelta,
  };
}
