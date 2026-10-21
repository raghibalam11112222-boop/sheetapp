"use client";

import { useEffect, useRef, useState } from "react";

const START_VALUE = 1000;
const DURATION_MS = 2000;

function format(value: number): string {
  return value.toLocaleString("en-US");
}

/**
 * Early-access remaining-spots counter.
 *
 * Starts at 1,000 and eases down to `remaining` once ~25% of the element is
 * visible (IntersectionObserver — never on page load). The final value is
 * owned by the server (`remaining` prop), so the counter can never invent a
 * number, go below 0, or differ between renders.
 *
 * Smoothness: intermediate frames write straight to the DOM node instead of
 * re-rendering React 60 times a second; React state only syncs the final
 * value when the animation lands.
 */
export function EarlyAccessCounter({ remaining }: { remaining: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const startedRef = useRef(false);
  const [display, setDisplay] = useState(START_VALUE);
  const [animating, setAnimating] = useState(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      const id = window.requestAnimationFrame(() => {
        setDisplay(remaining);
        setSettled(true);
      });
      return () => window.cancelAnimationFrame(id);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || startedRef.current) return;
        startedRef.current = true;
        io.disconnect();
        if (remaining >= START_VALUE) {
          raf = window.requestAnimationFrame(() => setSettled(true));
          return;
        }
        setAnimating(true);
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min((now - start) / DURATION_MS, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          const value = Math.round(START_VALUE + (remaining - START_VALUE) * eased);
          if (numRef.current) numRef.current.textContent = format(value);
          if (t < 1) {
            raf = window.requestAnimationFrame(tick);
          } else {
            setDisplay(remaining);
            setAnimating(false);
            setSettled(true);
          }
        };
        raf = window.requestAnimationFrame(tick);
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [remaining]);

  return (
    <span
      ref={ref}
      className={`inline-block text-[2.5rem] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[#111318] transition-opacity duration-300 md:text-6xl ${
        animating ? "opacity-80" : "opacity-100"
      } ${settled ? "animate-settle" : ""}`}
    >
      <span ref={numRef} aria-hidden suppressHydrationWarning>
        {format(display)}
      </span>
      <span className="sr-only">{format(remaining)} free spots remaining</span>
    </span>
  );
}
