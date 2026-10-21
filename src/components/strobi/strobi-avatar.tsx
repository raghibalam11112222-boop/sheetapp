"use client";

import { useId } from "react";
import type { StrobiExpression } from "./types";

interface StrobiAvatarProps {
  expression: StrobiExpression;
  bodyColor?: string;
  eyesColor?: string;
  /** Smoothing for pose changes (from animation transitionMs). */
  transitionMs?: number;
  /** 1 = open, ~0.08 = blinked. */
  blinkScaleY?: number;
  blinkMs?: number;
  size?: number;
  label?: string;
}

function motionClass(motion: string | undefined, kind: "eyes" | "body"): string {
  if (motion === "shake") return kind === "eyes" ? "strobi-eyes-shake" : "strobi-shake";
  if (motion === "slowDrift" || motion === "slowdrift") return "strobi-drift";
  return "";
}

/**
 * Renders one Strobi pose as SVG: sphere body + two elliptical eyes.
 * All geometry is driven by the avatar-definition JSON — no hardcoded poses.
 */
export function StrobiAvatar({
  expression,
  bodyColor,
  eyesColor,
  transitionMs = 300,
  blinkScaleY = 1,
  blinkMs = 150,
  size = 240,
  label = "Strobi avatar",
}: StrobiAvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const body = expression.colors?.body ?? bodyColor ?? "#5b7fe5";
  const eyes = expression.colors?.eyes ?? eyesColor ?? "#111316";
  const { head, eyes: eyeDef } = expression;
  const scale = 1 + (head.z ?? 0) / 1500;
  const tx = 120 + (head.x ?? 0);
  const ty = 120 + (head.y ?? 0);

  const renderEye = (side: "left" | "right") => {
    const e = eyeDef[side];
    const cx = (side === "left" ? -eyeDef.spacing / 2 : eyeDef.spacing / 2) + (e.x ?? 0);
    const cy = e.y ?? 0;
    return (
      <ellipse
        key={side}
        cx={cx}
        cy={cy}
        rx={Math.max(e.width, 2) / 2}
        ry={Math.max(e.height, 2) / 2}
        fill={eyes}
        transform={`rotate(${e.angle ?? 0} ${cx} ${cy})`}
        style={{ transition: `all ${transitionMs}ms ease` }}
      />
    );
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <defs>
        <radialGradient id={`strobi-glow-${uid}`} cx="35%" cy="28%" r="75%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.18" />
        </radialGradient>
      </defs>
      <g className={motionClass(expression.motion?.body, "body")}>
        <g
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transition: `transform ${transitionMs}ms ease`,
          }}
        >
          <g transform="translate(-120 -120)">
            <circle cx={120} cy={120} r={116} fill={body} style={{ transition: `fill ${transitionMs}ms ease` }} />
            <circle cx={120} cy={120} r={116} fill={`url(#strobi-glow-${uid})`} />
            <g className={motionClass(expression.motion?.eyes, "eyes")}>
              <g
                style={{
                  transform: `scale(1 ${blinkScaleY})`,
                  transformBox: "fill-box",
                  transformOrigin: "center",
                  transition: `transform ${blinkMs}ms ease`,
                }}
              >
                {renderEye("left")}
                {renderEye("right")}
              </g>
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}
