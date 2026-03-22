import type { DiagramNode } from "./parseConsoleDiagram";

export type VisualNodeKind = "structural" | "content" | "note";

export type VisualNode = {
  id: string;
  kind: VisualNodeKind;
  title: string;
  items?: string[];
  children?: VisualNode[];
};

type PlanOptions = {
  maxLeafItems?: number;
};

const DEFAULT_OPTIONS: Required<PlanOptions> = {
  maxLeafItems: 8,
};

const NOTE_RE = /\b(note|warning|important|takeaway|caution|observation|tip|summary)\b/i;
const LIST_RE =
  /\b(algorithms?|tools?|concepts?|architectures?|examples?|items?|techniques?|methods?|frameworks?|models?|components?|libraries?|datasets?|platforms?|principles?|patterns?|types?)\b/i;
const PROCESS_RE =
  /\b(process|workflow|pipeline|development|training|modeling|steps?|phase|lifecycle|flow|plan)\b/i;

const isLeaf = (node: DiagramNode) => !node.children || node.children.length === 0;

const isListLike = (label: string) => LIST_RE.test(label);
const isNoteLike = (label: string) => NOTE_RE.test(label);
const isProcessLike = (label: string) => PROCESS_RE.test(label);

const normalizeItem = (label: string) =>
  label.replace(/\s+/g, " ").trim();

const shouldCollapseToContent = (
  node: DiagramNode,
  depth: number
): boolean => {
  const children = node.children || [];
  if (children.length === 0) return false;
  const allLeaf = children.every(isLeaf);
  if (!allLeaf) return false;

  const leafCount = children.length;
  const avgLength =
    children.reduce((sum, child) => sum + child.label.length, 0) / leafCount;

  if (depth <= 1) return false;
  if (leafCount >= 3) return true;
  if (isListLike(node.label) && leafCount >= 2) return true;
  if (avgLength <= 22 && leafCount >= 2) return true;
  return false;
};

const shouldGroupLeafSiblings = (
  parent: DiagramNode,
  depth: number,
  leafCount: number
) => {
  if (leafCount < 3) return false;
  if (depth <= 1) return false;
  if (isProcessLike(parent.label)) return false;
  return true;
};

const buildId = (path: number[]) =>
  `visual-${path.length ? path.join("-") : "root"}`;

const deriveGroupTitle = (parentLabel: string) => {
  if (isListLike(parentLabel)) return `${parentLabel} items`;
  return "Key items";
};

const planNode = (
  node: DiagramNode,
  depth: number,
  path: number[],
  options: Required<PlanOptions>
): VisualNode => {
  const id = buildId(path);
  const title = normalizeItem(node.label);
  const children = node.children || [];

  if (isNoteLike(title)) {
    const leafItems = children.filter(isLeaf).map((child) => normalizeItem(child.label));
    const items =
      leafItems.length > 0 ? leafItems.slice(0, options.maxLeafItems) : undefined;
    return { id, kind: "note", title, items };
  }

  if (shouldCollapseToContent(node, depth)) {
    const items = children
      .map((child) => normalizeItem(child.label))
      .filter(Boolean)
      .slice(0, options.maxLeafItems);
    return { id, kind: "content", title, items };
  }

  const plannedChildren: VisualNode[] = [];
  const groupLeafs = shouldGroupLeafSiblings(
    node,
    depth,
    children.filter(isLeaf).length
  );
  let groupedLeafItems: string[] | null = null;
  let insertedGroup = false;

  children.forEach((child, index) => {
    if (isLeaf(child) && groupLeafs) {
      if (!groupedLeafItems) groupedLeafItems = [];
      groupedLeafItems.push(normalizeItem(child.label));
      if (!insertedGroup) {
        plannedChildren.push({
          id: `${id}-items`,
          kind: "content",
          title: deriveGroupTitle(title),
          items: [],
        });
        insertedGroup = true;
      }
      return;
    }

    plannedChildren.push(planNode(child, depth + 1, [...path, index], options));
  });

  if (groupedLeafItems && groupedLeafItems.length > 0) {
    const items = groupedLeafItems
      .filter(Boolean)
      .slice(0, options.maxLeafItems);
    const groupNode = plannedChildren.find((child) => child.id === `${id}-items`);
    if (groupNode) {
      groupNode.items = items;
    } else if (items.length > 0) {
      plannedChildren.push({
        id: `${id}-items`,
        kind: "content",
        title: deriveGroupTitle(title),
        items,
      });
    }
  }

  return {
    id,
    kind: "structural",
    title,
    children: plannedChildren.length > 0 ? plannedChildren : undefined,
  };
};

export const planVisualDiagram = (
  root: DiagramNode,
  opts?: PlanOptions
): VisualNode => {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  return planNode(root, 0, [], options);
};
