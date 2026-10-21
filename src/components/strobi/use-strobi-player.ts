"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StrobiAnimation } from "./types";

export interface PlayerState {
  /** Currently displayed expression name. */
  expressionName: string;
  /** Smoothing to apply when moving to it. */
  transitionMs: number;
  /** Whether an animation loop is running (vs a frozen pose). */
  playing: boolean;
  /** Currently playing animation name, if any. */
  animationName: string | null;
  /** Blink overlay active. */
  blinking: boolean;
  blinkMs: number;
}

/**
 * Drives a Strobi animation: loops steps (hold → smooth transition),
 * plus the animation's own blink schedule. Looping stops when the
 * animation name changes or `stop()` is called.
 */
export function useStrobiPlayer(
  getAnimation: (name: string) => StrobiAnimation | undefined
) {
  const [state, setState] = useState<PlayerState>({
    expressionName: "neutral",
    transitionMs: 300,
    playing: false,
    animationName: null,
    blinking: false,
    blinkMs: 200,
  });
  const timers = useRef<number[]>([]);
  const runId = useRef(0);

  const clearTimers = useCallback(() => {
    runId.current += 1;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, Math.max(0, ms)));
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const pose = useCallback(
    (expressionName: string, transitionMs = 300) => {
      clearTimers();
      setState((s) => ({
        ...s,
        expressionName,
        transitionMs,
        playing: false,
        animationName: null,
        blinking: false,
      }));
    },
    [clearTimers]
  );

  const play = useCallback(
    (animationName: string) => {
      const anim = getAnimation(animationName);
      if (!anim || anim.steps.length === 0) return;
      clearTimers();
      const id = runId.current;

      const scheduleBlink = (cfg: StrobiAnimation["blink"]) => {
        if (!cfg.enabled) return;
        // Recursive loop: blink, pause a random gap, blink again.
        const scheduleNext = (delay: number) => {
          later(() => {
            if (runId.current !== id) return;
            setState((s) => (s.animationName === animationName ? { ...s, blinking: true, blinkMs: cfg.durationMs } : s));
            later(() => {
              if (runId.current !== id) return;
              setState((s) => (s.animationName === animationName ? { ...s, blinking: false } : s));
              scheduleNext(cfg.minIntervalMs + Math.random() * Math.max(0, cfg.maxIntervalMs - cfg.minIntervalMs));
            }, cfg.durationMs);
          }, delay);
        };
        scheduleNext(cfg.initialDelayMs);
      };

      const stepLoop = (index: number) => {
        if (runId.current !== id) return;
        const step = anim.steps[index % anim.steps.length];
        setState({
          expressionName: step.expression,
          transitionMs: step.transitionMs,
          playing: true,
          animationName,
          blinking: false,
          blinkMs: anim.blink.durationMs,
        });
        later(() => stepLoop(index + 1), step.holdMs + step.transitionMs);
      };

      stepLoop(0);
      scheduleBlink(anim.blink);
    },
    [clearTimers, getAnimation, later]
  );

  const stop = useCallback(() => {
    clearTimers();
    setState((s) => ({ ...s, playing: false, animationName: null, blinking: false }));
  }, [clearTimers]);

  return { ...state, play, pose, stop };
}
