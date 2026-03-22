export type GroupedGraphNode = {
  id: string;
  label: string;
};

export type GroupedGraphCluster = {
  id: string;
  label: string;
  nodes: GroupedGraphNode[];
};

export type GroupedGraphEdge = {
  from: string;
  to: string;
};

export type GroupedGraphBlueprint = {
  type: "grouped-graph";
  root: GroupedGraphNode;
  clusters: GroupedGraphCluster[];
  edges: GroupedGraphEdge[];
};

const normalizeLabel = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const normalizeId = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const ensureUniqueId = (base: string, used: Set<string>) => {
  let id = base || "node";
  let counter = 2;
  while (used.has(id)) {
    id = `${base || "node"}-${counter}`;
    counter += 1;
  }
  used.add(id);
  return id;
};

export const sanitizeGroupedGraphBlueprint = (
  raw: any
): GroupedGraphBlueprint | null => {
  if (!raw || typeof raw !== "object") return null;
  if (raw.type !== "grouped-graph") return null;

  const usedIds = new Set<string>();

  const rootLabel = normalizeLabel(raw.root?.label);
  if (!rootLabel) return null;
  const rootIdBase =
    normalizeId(raw.root?.id) || slugify(rootLabel) || "root";
  const rootId = ensureUniqueId(rootIdBase || "root", usedIds);
  const root: GroupedGraphNode = { id: rootId, label: rootLabel };

  const clusters: GroupedGraphCluster[] = Array.isArray(raw.clusters)
    ? raw.clusters
        .map((cluster: any, index: number) => {
          if (!cluster || typeof cluster !== "object") return null;
          const clusterLabel = normalizeLabel(cluster.label);
          if (!clusterLabel) return null;
          const clusterIdBase =
            normalizeId(cluster.id) ||
            slugify(clusterLabel) ||
            `cluster-${index + 1}`;
          const clusterId = ensureUniqueId(clusterIdBase, usedIds);
          const nodes: GroupedGraphNode[] = Array.isArray(cluster.nodes)
            ? cluster.nodes
                .map((node: any, nodeIndex: number) => {
                  if (!node || typeof node !== "object") return null;
                  const label = normalizeLabel(node.label);
                  if (!label) return null;
                  const nodeIdBase =
                    normalizeId(node.id) ||
                    slugify(label) ||
                    `node-${index + 1}-${nodeIndex + 1}`;
                  const nodeId = ensureUniqueId(nodeIdBase, usedIds);
                  return { id: nodeId, label };
                })
                .filter(Boolean)
            : [];
          return { id: clusterId, label: clusterLabel, nodes };
        })
        .filter(Boolean)
    : [];

  const validIds = new Set<string>([root.id]);
  clusters.forEach((cluster) => {
    validIds.add(cluster.id);
    cluster.nodes.forEach((node) => validIds.add(node.id));
  });

  const edges: GroupedGraphEdge[] = Array.isArray(raw.edges)
    ? raw.edges
        .map((edge: any) => {
          if (!edge || typeof edge !== "object") return null;
          const from = normalizeId(edge.from);
          const to = normalizeId(edge.to);
          if (!from || !to) return null;
          if (!validIds.has(from) || !validIds.has(to)) return null;
          return { from, to };
        })
        .filter(Boolean)
    : [];

  return {
    type: "grouped-graph",
    root,
    clusters,
    edges,
  };
};
