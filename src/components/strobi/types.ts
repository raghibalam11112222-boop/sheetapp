export interface StrobiEye {
  width: number;
  height: number;
  x: number;
  y: number;
  angle: number;
}

export interface StrobiExpression {
  head: { x: number; y: number; z: number };
  eyes: {
    left: StrobiEye;
    right: StrobiEye;
    spacing: number;
  };
  perspective: number;
  motion: { eyes: string; body: string };
  colors?: { body?: string; eyes?: string };
}

export interface StrobiBlink {
  enabled: boolean;
  initialDelayMs: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  durationMs: number;
}

export interface StrobiStep {
  expression: string;
  holdMs: number;
  transitionMs: number;
  transition: string;
}

export interface StrobiAnimation {
  playbackMode: string;
  steps: StrobiStep[];
  blink: StrobiBlink;
  metadata?: { label: string; description: string; group: string };
}

export interface StrobiDefinition {
  schema: string;
  schemaVersion: number;
  name: string;
  body: unknown;
  colors: { body: string; eyes: string };
  expressions: Record<string, StrobiExpression>;
  expressionOrder: string[];
  animations: Record<string, StrobiAnimation>;
  animationOrder: string[];
}
