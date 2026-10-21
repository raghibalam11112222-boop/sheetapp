"use client";

import { useMemo } from "react";
import { ArrowDown, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface EntitySummary {
  key: string;
  label: string;
  fieldCount: number;
  recordCount: number;
}

export interface ChainRelationship {
  fromTableKey: string;
  toTableKey: string;
}

/**
 * "We found N business entities" summary with relationship chains
 * (parent ↓ child), extracted from the schema review screen.
 */
export function EntitiesCard({
  tables,
  relationships,
}: {
  tables: EntitySummary[];
  relationships: ChainRelationship[];
}) {
  const chains = useMemo(() => {
    const keys = tables.map((t) => t.key);
    const inSet = new Set(keys);
    const childrenOf = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const rel of relationships) {
      const parent = rel.toTableKey;
      const child = rel.fromTableKey;
      if (parent === child || !inSet.has(parent) || !inSet.has(child)) continue;
      const list = childrenOf.get(parent) ?? [];
      if (!list.includes(child)) {
        list.push(child);
        childrenOf.set(parent, list);
      }
      hasParent.add(child);
    }
    const labelOf = new Map(tables.map((t) => [t.key, t.label] as const));
    const visited = new Set<string>();
    const result: string[][] = [];
    const roots = keys.filter((k) => !hasParent.has(k));
    for (const start of [...roots, ...keys]) {
      if (visited.has(start)) continue;
      visited.add(start);
      const chain = [start];
      let current = start;
      while ((childrenOf.get(current) ?? []).length === 1) {
        const next = (childrenOf.get(current) ?? [])[0];
        if (visited.has(next)) break;
        visited.add(next);
        chain.push(next);
        current = next;
      }
      result.push(chain);
    }
    return { chains: result, labelOf };
  }, [tables, relationships]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          We found {tables.length} business{" "}
          {tables.length === 1 ? "entity" : "entities"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="flex flex-wrap gap-2">
          {tables.map((table) => (
            <li
              key={table.key}
              className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#F8F9FA] px-3 py-2 text-sm"
            >
              <Table2 className="h-4 w-4 text-[#6B7280]" />
              <span className="font-medium text-[#111111]">{table.label}</span>
              <span className="text-xs text-[#6B7280]">
                {table.fieldCount} fields · {table.recordCount.toLocaleString()} rows
              </span>
            </li>
          ))}
        </ul>
        {relationships.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#6B7280]">
              Relationships
            </p>
            <div className="flex flex-wrap items-start gap-6">
              {chains.chains.map((chain, i) => (
                <div key={i} className="flex flex-col items-center">
                  {chain.map((key, j) => (
                    <div key={key} className="flex flex-col items-center">
                      {j > 0 && <ArrowDown className="my-1 h-4 w-4 text-[#6B7280]" />}
                      <span className="rounded-md border border-[#E5E7EB] bg-white px-3 py-1.5 text-sm font-medium text-[#111111]">
                        {chains.labelOf.get(key) ?? key}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
