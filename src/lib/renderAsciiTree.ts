export type DiagramNode = {
  label: string;
  children?: DiagramNode[];
};

export type DiagramBlueprint = {
  type: "hierarchy";
  root: DiagramNode;
};

const normalizeLabel = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const sanitizeNode = (value: any): DiagramNode | null => {
  if (typeof value === "string") {
    const label = normalizeLabel(value);
    return label ? { label } : null;
  }
  if (!value || typeof value !== "object") return null;
  const label = normalizeLabel(value.label);
  if (!label) return null;
  const rawChildren = Array.isArray(value.children) ? value.children : [];
  const children = rawChildren
    .map((child) => sanitizeNode(child))
    .filter(Boolean) as DiagramNode[];
  return children.length > 0 ? { label, children } : { label };
};

export const sanitizeBlueprint = (raw: any): DiagramBlueprint | null => {
  if (!raw || typeof raw !== "object") return null;
  if (raw.type !== "hierarchy") return null;
  const root = sanitizeNode(raw.root);
  if (!root) return null;
  return { type: "hierarchy", root };
};

const renderNode = (node: DiagramNode, prefix: string, isLast: boolean, lines: string[]) => {
  const connector = isLast ? "└─ " : "├─ ";
  lines.push(`${prefix}${connector}${node.label}`);

  const children = Array.isArray(node.children) ? node.children : [];
  if (children.length === 0) return;

  const nextPrefix = prefix + (isLast ? "   " : "│  ");
  children.forEach((child, index) => {
    const last = index === children.length - 1;
    renderNode(child, nextPrefix, last, lines);
  });
};

export const renderAsciiTree = (blueprint: DiagramBlueprint): string => {
  const lines: string[] = [];
  lines.push(blueprint.root.label);
  const children = Array.isArray(blueprint.root.children) ? blueprint.root.children : [];
  children.forEach((child, index) => {
    const last = index === children.length - 1;
    renderNode(child, "", last, lines);
  });
  return lines.join("\n");
};
