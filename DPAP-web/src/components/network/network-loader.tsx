import { getNetwork } from "@/lib/api/network";
import { getServerAuthToken } from "@/lib/auth/session";
import { getDictionary } from "@/i18n/dictionary";
import { NetworkGraph } from "@/components/network/network-graph";
import { modules, optionsFor, type Option } from "@/form/schema-model";

/** Server loader: fetches the graph + resolves the relation-type labels from the schema. */
export async function NetworkLoader() {
  const token = await getServerAuthToken();
  const [network, dict] = await Promise.all([
    getNetwork(undefined, { token }).catch(() => ({
      nodes: [],
      edges: [],
      metrics: { nodeCount: 0, edgeCount: 0, registeredCount: 0, isolatedCount: 0, mostConnected: [] },
    })),
    getDictionary(),
  ]);
  const m = dict.network.metrics;

  const n03 = modules().find((x) => x.key === "N")?.rosters.find((r) => r.id === "N.03");
  const col = n03?.columns.find((c) => c.name === "relation_types");
  const relationOptions: Option[] = col ? optionsFor(col) : [];

  const stat = (label: string, value: number) => (
    <div className="rounded-lg border border-black/10 bg-white px-4 py-3 dark:border-white/15 dark:bg-zinc-900">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-xl font-semibold tabular-nums">{value.toLocaleString("pt-PT")}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stat(m.nodes, network.metrics.nodeCount)}
        {stat(m.edges, network.metrics.edgeCount)}
        {stat(m.registered, network.metrics.registeredCount)}
        {stat(m.isolated, network.metrics.isolatedCount)}
      </div>

      <NetworkGraph network={network} relationOptions={relationOptions} />

      {network.metrics.mostConnected.length > 0 ? (
        <div className="rounded-xl border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-zinc-900">
          <h2 className="mb-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">{m.mostConnected}</h2>
          <ol className="space-y-1 text-sm">
            {network.metrics.mostConnected.map((a, i) => (
              <li key={a.id} className="flex justify-between gap-3">
                <span>{i + 1}. {a.label}</span>
                <span className="tabular-nums text-zinc-500">{a.degree}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  );
}
