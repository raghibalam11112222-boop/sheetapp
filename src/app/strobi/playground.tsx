"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { Pause, Play, Shuffle } from "lucide-react";
import rawDefinition from "@/components/strobi/strobi.avatar.json";
import { StrobiAvatar } from "@/components/strobi/strobi-avatar";
import { useStrobiPlayer } from "@/components/strobi/use-strobi-player";
import type { StrobiAnimation, StrobiDefinition } from "@/components/strobi/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/components/ui/utils";

const definition = rawDefinition as unknown as StrobiDefinition;

export function StrobiPlayground() {
  const getAnimation = useCallback(
    (name: string): StrobiAnimation | undefined => definition.animations[name],
    []
  );
  const player = useStrobiPlayer(getAnimation);
  const autoStarted = useRef(false);

  // Lively first impression: play the idle loop on load.
  useEffect(() => {
    if (!autoStarted.current && definition.animations["idle"]) {
      autoStarted.current = true;
      player.play("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const expression = useMemo(
    () =>
      definition.expressions[player.expressionName] ??
      definition.expressions["neutral"],
    [player.expressionName]
  );

  const groups = useMemo(() => {
    const map = new Map<string, { name: string; label: string }[]>();
    for (const name of definition.animationOrder) {
      const anim = definition.animations[name];
      if (!anim) continue;
      const group = anim.metadata?.group ?? "Other";
      const list = map.get(group) ?? [];
      list.push({ name, label: anim.metadata?.label ?? name });
      map.set(group, list);
    }
    return [...map.entries()];
  }, []);

  const currentAnim = player.animationName ? definition.animations[player.animationName] : undefined;

  function surprise() {
    const names = definition.animationOrder.filter((n) => definition.animations[n]);
    const pick = names[Math.floor(Math.random() * names.length)];
    if (pick) player.play(pick);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card className="h-fit lg:sticky lg:top-20">
          <CardContent className="flex flex-col items-center pt-6">
            <StrobiAvatar
              expression={expression}
              bodyColor={definition.colors.body}
              eyesColor={definition.colors.eyes}
              transitionMs={player.transitionMs}
              blinkScaleY={player.blinking ? 0.08 : 1}
              blinkMs={player.blinkMs}
              size={280}
              label={`Strobi showing ${player.expressionName}`}
            />
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
              <Badge variant={player.playing ? "success" : "neutral"}>
                {player.playing ? `Playing: ${currentAnim?.metadata?.label ?? player.animationName}` : `Pose: ${player.expressionName}`}
              </Badge>
            </div>
            {currentAnim?.metadata?.description && player.playing && (
              <p className="mt-2 text-center text-sm text-[#6B7280]">
                {currentAnim.metadata.description}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button variant="secondary" size="sm" onClick={surprise}>
                <Shuffle className="h-3.5 w-3.5" /> Surprise me
              </Button>
              {player.playing && (
                <Button variant="ghost" size="sm" onClick={player.stop}>
                  <Pause className="h-3.5 w-3.5" /> Stop
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {groups.map(([group, anims]) => (
            <Card key={group}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Animations · {group}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {anims.map(({ name, label }) => {
                    const active = player.animationName === name;
                    return (
                      <Button
                        key={name}
                        size="sm"
                        variant={active ? "primary" : "secondary"}
                        onClick={() => player.play(name)}
                      >
                        {!active && <Play className="h-3.5 w-3.5" />}
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Expressions · {definition.expressionOrder.length} poses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-[#6B7280]">
                Pick a pose to freeze Strobi (stops any playing animation).
              </p>
              <div className="flex flex-wrap gap-1.5">
                {definition.expressionOrder.map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => player.pose(name)}
                    className={cn(
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                      !player.playing && player.expressionName === name
                        ? "border-[#111111] bg-[#F8F9FA] text-[#111111]"
                        : "border-[#E5E7EB] text-[#6B7280] hover:text-[#111111]"
                    )}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-[#E5E7EB] pt-3 text-xs text-[#6B7280]">
                <span>
                  {definition.name} · schema {definition.schema} v{definition.schemaVersion}
                </span>
                <Link href="/" className="font-medium text-[#111111] hover:underline">
                  Back to home
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
