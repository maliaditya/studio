import { renderAsciiTree, sanitizeBlueprint, type DiagramBlueprint } from "@/lib/renderAsciiTree";
import { normalizeDiagramLabels } from "@/lib/normalizeDiagramLabels";

const normalizeText = (value: string) =>
  String(value || "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const shorten = (value: string, max = 120) => {
  const text = normalizeText(value);
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
};

const asArray = (value: unknown) => (Array.isArray(value) ? value : []);

const getEntityName = (block: any) =>
  normalizeText(
    block?.entity ||
      block?.from ||
      block?.actor ||
      block?.component ||
      block?.name ||
      block?.stage ||
      block?.item ||
      ""
  );

const pickRoot = (blocks: any[]): string => {
  const freq = new Map<string, number>();
  for (const block of blocks) {
    const entity = getEntityName(block);
    if (!entity) continue;
    freq.set(entity, (freq.get(entity) || 0) + 1);
  }
  const defs = blocks.filter((b) => String(b?.type).toLowerCase() === "definition");
  if (defs[0]?.entity) {
    return normalizeText(defs[0].entity);
  }
  let best = "Topic";
  let bestCount = 0;
  for (const [entity, count] of freq) {
    if (count > bestCount) {
      best = entity;
      bestCount = count;
    }
  }
  return best || "Topic";
};

const isGoodLabel = (label: string) => {
  const clean = normalizeText(label);
  if (!clean) return false;
  const words = clean.split(" ");
  if (words.length > 8) return false;
  if (clean.length > 60) return false;
  if (/[.!?]|[:;]/.test(clean)) return false;
  return true;
};

const getOrCreateEntityNode = (root: DiagramBlueprint["root"], label: string) => {
  const clean = normalizeText(label);
  if (!isGoodLabel(clean)) return root;
  const children = root.children || [];
  let node = children.find((child) => normalizeText(child.label) === clean);
  if (!node) {
    node = { label: clean, children: [] };
    children.push(node);
    root.children = children;
  }
  return node;
};

export const buildDiagramFromBlocks = (blocks: any[]): string => {
  const safeBlocks = asArray(blocks);
  const rootLabel = pickRoot(safeBlocks);
  const root: DiagramBlueprint["root"] = { label: rootLabel, children: [] };
  const flowSteps: { order: number; action: string }[] = [];

  for (const block of safeBlocks) {
    const type = String(block?.type || "").toLowerCase();
    if (!type) continue;

    if (type === "flow" && Array.isArray(block?.steps)) {
      for (const step of block.steps) {
        const action = shorten(step?.action || "", 100);
        if (!action) continue;
        if (action.length > 120) continue;
        flowSteps.push({ order: Number(step?.order) || flowSteps.length + 1, action });
      }
      continue;
    }

    if (type === "stage") {
      const name = shorten(block?.name || "", 100);
      if (name) flowSteps.push({ order: flowSteps.length + 1, action: name });
      continue;
    }

    if (type === "definition") {
      const entity = getEntityName(block) || rootLabel;
      const defText = shorten(block?.text || "", 120);
      if (defText.length > 120) continue;
      const node = getOrCreateEntityNode(root, entity);
      if (node !== root && defText) node.children?.push({ label: `attr: definition -> ${defText}` });
      continue;
    }

    if (type === "attribute") {
      const entity = getEntityName(block) || rootLabel;
      const name = shorten(block?.name || "", 60);
      const value = shorten(block?.value || "", 100);
      if (value.length > 120) continue;
      const node = getOrCreateEntityNode(root, entity);
      if (node !== root) {
        if (name && value) node.children?.push({ label: `attr: ${name} -> ${value}` });
        else if (name) node.children?.push({ label: `attr: ${name}` });
      }
      continue;
    }

    if (type === "relation") {
      const from = normalizeText(block?.from || rootLabel);
      const to = shorten(block?.to || "", 80);
      const relation = normalizeText(block?.relation || "linked to");
      if (!to) continue;
      const node = getOrCreateEntityNode(root, from);
      if (node !== root) node.children?.push({ label: `${relation} -> ${to}` });
      continue;
    }

    if (type === "action") {
      const actor = normalizeText(block?.actor || rootLabel);
      const action = normalizeText(block?.action || "acts on");
      const target = shorten(block?.target || "", 80);
      const node = getOrCreateEntityNode(root, actor);
      if (node !== root) node.children?.push({ label: target ? `${action} -> ${target}` : `${action}` });
      continue;
    }

    if (type === "component") {
      const name = shorten(block?.name || "");
      if (!name) continue;
      const node = getOrCreateEntityNode(root, rootLabel);
      node.children?.push({
        label: name,
        children: block?.responsibility
          ? [{ label: `attr: responsibility -> ${shorten(block.responsibility, 100)}` }]
          : [],
      });
      continue;
    }

    if (type === "interface") {
      const component = normalizeText(block?.component || rootLabel);
      const node = getOrCreateEntityNode(root, component);
      const iface = shorten(block?.interface || "");
      if (iface) node.children?.push({ label: `uses -> ${iface}` });
      continue;
    }

    if (type === "dependency") {
      const from = normalizeText(block?.from || rootLabel);
      const to = shorten(block?.to || "");
      if (!to) continue;
      const node = getOrCreateEntityNode(root, from);
      node.children?.push({ label: `depends on -> ${to}` });
      continue;
    }

    if (type === "example") {
      const entity = getEntityName(block) || rootLabel;
      const node = getOrCreateEntityNode(root, entity);
      const text = shorten(block?.text || "", 100);
      if (text && node !== root) node.children?.push({ label: `example: ${text}` });
      continue;
    }
  }

  if (flowSteps.length > 0) {
    const flowNode = { label: "Flow", children: [] as DiagramBlueprint["root"]["children"] };
    flowSteps
      .sort((a, b) => a.order - b.order)
      .slice(0, 10)
      .forEach((step, index) => {
        const label = shorten(step.action, 100);
        if (!label) return;
        flowNode.children?.push({ label: `Step ${index + 1}: ${label}` });
      });
    if (flowNode.children?.length) root.children?.push(flowNode);
  }

  const blueprint = sanitizeBlueprint({ type: "hierarchy", root });
  if (!blueprint) return "";
  const normalized = normalizeDiagramLabels(blueprint);
  return renderAsciiTree(normalized);
};
