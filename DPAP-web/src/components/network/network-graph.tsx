"use client";

/**
 * Interactive multi-actor network graph (BRD FR-NET-3). Dependency-free: a
 * small deterministic force layout drawn as inline SVG. Registered actors and
 * unregistered partners are the two node classes (CVD-safe two-hue encoding per
 * the dataviz skill — no 5-way categorical palette); node radius encodes degree.
 * Hover shows a tooltip; clicking a registered node opens its actor profile.
 * A relationship-type filter narrows the edges client-side.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDictionary, useLocale } from "@/i18n/provider";
import { routes } from "@/config/routes";
import type { Network, NetworkNode } from "@/lib/api/types";
import type { Option } from "@/form/schema-model";

const W = 720;
const H = 520;

type Pos = { x: number; y: number };

function layout(nodes: NetworkNode[], edges: { source: string; target: string }[]): Map<string, Pos> {
  const n = nodes.length;
  const pos = new Map<string, Pos>();
  if (n === 0) return pos;
  // Deterministic seed: evenly on a circle.
  nodes.forEach((node, i) => {
    const a = (2 * Math.PI * i) / n;
    pos.set(node.id, { x: W / 2 + Math.cos(a) * 200, y: H / 2 + Math.sin(a) * 200 });
  });
  const k = Math.sqrt((W * H) / Math.max(n, 1)) * 0.6;
  const idx = new Map(nodes.map((nd, i) => [nd.id, i]));
  const p = nodes.map((nd) => pos.get(nd.id)!);
  const es = edges
    .map((e) => [idx.get(e.source), idx.get(e.target)] as const)
    .filter(([a, b]) => a != null && b != null) as [number, number][];

  for (let iter = 0; iter < 140; iter++) {
    const disp = p.map(() => ({ x: 0, y: 0 }));
    // Repulsion.
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = p[i].x - p[j].x;
        let dy = p[i].y - p[j].y;
        const d = Math.hypot(dx, dy) || 0.01;
        const f = (k * k) / d;
        dx = (dx / d) * f;
        dy = (dy / d) * f;
        disp[i].x += dx; disp[i].y += dy;
        disp[j].x -= dx; disp[j].y -= dy;
      }
    }
    // Attraction along edges.
    for (const [a, b] of es) {
      let dx = p[a].x - p[b].x;
      let dy = p[a].y - p[b].y;
      const d = Math.hypot(dx, dy) || 0.01;
      const f = (d * d) / k;
      dx = (dx / d) * f;
      dy = (dy / d) * f;
      disp[a].x -= dx; disp[a].y -= dy;
      disp[b].x += dx; disp[b].y += dy;
    }
    const t = 1 - iter / 140;
    for (let i = 0; i < n; i++) {
      // Gravity toward centre.
      disp[i].x += (W / 2 - p[i].x) * 0.02;
      disp[i].y += (H / 2 - p[i].y) * 0.02;
      const d = Math.hypot(disp[i].x, disp[i].y) || 0.01;
      const step = Math.min(d, 20 * t);
      p[i].x += (disp[i].x / d) * step;
      p[i].y += (disp[i].y / d) * step;
      p[i].x = Math.max(20, Math.min(W - 20, p[i].x));
      p[i].y = Math.max(20, Math.min(H - 20, p[i].y));
    }
  }
  nodes.forEach((nd, i) => pos.set(nd.id, p[i]));
  return pos;
}

export function NetworkGraph({
  network,
  relationOptions,
}: {
  network: Network;
  relationOptions: Option[];
}) {
  const dict = useDictionary();
  const locale = useLocale();
  const t = dict.network;
  const [rel, setRel] = useState<string>("");
  const [hover, setHover] = useState<NetworkNode | null>(null);

  const edges = useMemo(
    () => (rel ? network.edges.filter((e) => (e.relationTypes ?? "").split(",").includes(rel)) : network.edges),
    [network.edges, rel],
  );
  // Only nodes touched by the (filtered) edges.
  const nodes = useMemo(() => {
    if (!rel) return network.nodes;
    const keep = new Set<string>();
    edges.forEach((e) => { keep.add(e.source); keep.add(e.target); });
    return network.nodes.filter((n) => keep.has(n.id));
  }, [network.nodes, edges, rel]);

  const pos = useMemo(() => layout(nodes, edges), [nodes, edges]);
  const maxDeg = Math.max(1, ...nodes.map((n) => n.degree));
  const radius = (n: NetworkNode) => 5 + (n.degree / maxDeg) * 10;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-zinc-500">{t.filterLabel}</label>
        <select
          value={rel}
          onChange={(e) => setRel(e.target.value)}
          className="min-h-9 rounded-lg border border-black/15 bg-white px-2 text-sm dark:border-white/20 dark:bg-zinc-900"
        >
          <option value="">{t.allTypes}</option>
          {relationOptions.map((o) => (
            <option key={o.code} value={o.code}>{o.label_pt}</option>
          ))}
        </select>
        <span className="flex items-center gap-1.5 text-xs text-zinc-500">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-600" /> {t.registered}
          <span className="ml-3 inline-block h-3 w-3 rounded-full bg-amber-500" /> {t.unregistered}
        </span>
      </div>

      {nodes.length === 0 ? (
        <p className="rounded-lg border border-black/10 bg-white p-6 text-sm text-zinc-500 dark:border-white/15 dark:bg-zinc-900">
          {t.empty}
        </p>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-black/10 bg-white dark:border-white/15 dark:bg-zinc-950">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-[520px] w-full" role="img" aria-label={t.title}>
            {edges.map((e, i) => {
              const a = pos.get(e.source);
              const b = pos.get(e.target);
              if (!a || !b) return null;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-black/15 dark:stroke-white/20" strokeWidth={1} />;
            })}
            {nodes.map((n) => {
              const p = pos.get(n.id);
              if (!p) return null;
              return (
                <g key={n.id} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(null)}
                   className="cursor-pointer">
                  <circle cx={p.x} cy={p.y} r={radius(n)}
                    className={n.registered ? "fill-emerald-600" : "fill-amber-500"}
                    stroke="white" strokeWidth={1.5} />
                </g>
              );
            })}
          </svg>
          {hover ? (
            <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-zinc-900/90 px-3 py-2 text-xs text-white">
              <div className="font-medium">{hover.label}</div>
              <div>{t.degree}: {hover.degree}</div>
              {hover.registered ? (
                <Link href={routes.actorDetail(locale, hover.id)} className="pointer-events-auto text-emerald-300 underline">
                  {t.openProfile}
                </Link>
              ) : (
                <div className="text-amber-300">{t.unregistered}</div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
