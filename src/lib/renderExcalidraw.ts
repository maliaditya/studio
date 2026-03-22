import type { PositionedVisualNode } from "./layoutClusteredDiagram";

export type ExcalidrawScene = {
  type: "excalidraw";
  version: number;
  source: string;
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any>;
};

type RenderOptions = {
  fontSize?: number;
  strokeWidth?: number;
  fillColor?: string;
  contentFillColor?: string;
  noteFillColor?: string;
  backgroundColor?: string;
  charWidth?: number;
  paddingX?: number;
  paddingY?: number;
};

const DEFAULT_OPTIONS: Required<RenderOptions> = {
  fontSize: 18,
  strokeWidth: 2,
  fillColor: "transparent",
  contentFillColor: "rgba(255,255,255,0.08)",
  noteFillColor: "rgba(255,255,255,0.06)",
  backgroundColor: "#0b0f19",
  charWidth: 7,
  paddingX: 18,
  paddingY: 12,
};

const DARK_THEME = {
  background: "#0b0f19",
  stroke: "#f8fafc",
  text: "#f8fafc",
  arrow: "#f8fafc",
  noteStroke: "#cbd5e1",
  contentFill: "transparent",
  noteFill: "transparent",
};

const CLUSTER_PALETTE = [
  "#5bc0eb",
  "#9b5de5",
  "#f15bb5",
  "#00bbf9",
  "#00f5d4",
  "#f77f00",
  "#f3722c",
  "#90be6d",
];


const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
};

const buildLines = (node: PositionedVisualNode) => {
  const lines: string[] = [];
  if (node.kind === "content") {
    lines.push(node.title);
    (node.items || []).forEach((item) => lines.push(`• ${item}`));
    return lines;
  }
  if (node.kind === "note") {
    lines.push(node.title);
    (node.items || []).forEach((item) => lines.push(`• ${item}`));
    return lines;
  }
  lines.push(node.title);
  return lines;
};

const createRectangle = (
  node: PositionedVisualNode,
  textId: string,
  opts: Required<RenderOptions>,
  theme: typeof DARK_THEME,
  strokeOverride?: string
) => {
  const seed = hashSeed(node.id);
  const fillColor =
    node.kind === "content"
      ? theme.contentFill
      : node.kind === "note"
      ? theme.noteFill
      : opts.fillColor;
  const baseStroke = node.kind === "note" ? theme.noteStroke : theme.stroke;
  const strokeColor = strokeOverride || baseStroke;
  const strokeStyle = node.kind === "note" ? "dashed" : "solid";
  return {
    id: `rect-${node.id}`,
    type: "rectangle",
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    angle: 0,
    strokeColor,
    backgroundColor: fillColor,
    fillStyle: "solid",
    strokeWidth: opts.strokeWidth,
    strokeStyle,
    roughness: 1,
    opacity: 100,
    groupIds: [],
    strokeSharpness: "sharp",
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    boundElements: [{ id: textId, type: "text" }],
    updated: 1,
    roundness: { type: 3 },
  };
};

const createText = (
  node: PositionedVisualNode,
  rectId: string,
  opts: Required<RenderOptions>,
  theme: typeof DARK_THEME,
  textOverride?: string
) => {
  const seed = hashSeed(`text-${node.id}`);
  const lines = buildLines(node);
  const maxLineLength = Math.max(1, ...lines.map((line) => line.length));
  const textWidth = maxLineLength * opts.charWidth;
  const textHeight = opts.fontSize * 1.25 * lines.length;
  const text = lines.join("\n");

  const isContent = node.kind === "content" || node.kind === "note";
  const textX = isContent
    ? node.x + opts.paddingX
    : node.x + (node.width - textWidth) / 2;
  const textY = isContent
    ? node.y + opts.paddingY
    : node.y + (node.height - textHeight) / 2;

  return {
    id: `text-${node.id}`,
    type: "text",
    x: textX,
    y: textY,
    width: textWidth,
    height: textHeight,
    angle: 0,
    strokeColor: textOverride || theme.text,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: opts.strokeWidth,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    strokeSharpness: "sharp",
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    text,
    color: textOverride || theme.text,
    fontSize: opts.fontSize,
    fontFamily: 1,
    textAlign: isContent ? "left" : "center",
    verticalAlign: isContent ? "top" : "middle",
    baseline: textHeight * 0.8,
    lineHeight: 1.25,
    containerId: rectId,
    originalText: text,
  };
};

const createArrow = (
  from: PositionedVisualNode,
  to: PositionedVisualNode,
  opts: Required<RenderOptions>,
  theme: typeof DARK_THEME,
  strokeOverride?: string
) => {
  const seed = hashSeed(`arrow-${from.id}-${to.id}`);
  const fromCenter = {
    x: from.x + from.width / 2,
    y: from.y + from.height / 2,
  };
  const toCenter = {
    x: to.x + to.width / 2,
    y: to.y + to.height / 2,
  };

  const startPoint = getRectBoundaryIntersection(
    { x: from.x, y: from.y, width: from.width, height: from.height },
    toCenter
  );
  const endPoint = getRectBoundaryIntersection(
    { x: to.x, y: to.y, width: to.width, height: to.height },
    fromCenter
  );

  const startX = startPoint.x;
  const startY = startPoint.y;
  const endX = endPoint.x;
  const endY = endPoint.y;
  const dx = endX - startX;
  const dy = endY - startY;
  return {
    id: `arrow-${from.id}-${to.id}`,
    type: "arrow",
    x: startX,
    y: startY,
    width: dx,
    height: dy,
    angle: 0,
    strokeColor: strokeOverride || theme.arrow,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: opts.strokeWidth,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    strokeSharpness: "round",
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    points: [
      [0, 0],
      [dx, dy],
    ],
    lastCommittedPoint: null,
    startBinding: { elementId: `rect-${from.id}`, focus: 0, gap: 6 },
    endBinding: { elementId: `rect-${to.id}`, focus: 0, gap: 6 },
    startArrowhead: null,
    endArrowhead: "arrow",
  };
};

const getRectBoundaryIntersection = (
  rect: { x: number; y: number; width: number; height: number },
  targetPoint: { x: number; y: number }
) => {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const dx = targetPoint.x - cx;
  const dy = targetPoint.y - cy;

  if (dx === 0 && dy === 0) {
    return { x: cx, y: cy };
  }

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;
  const scale = 1 / Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);

  return {
    x: cx + dx * scale,
    y: cy + dy * scale,
  };
};

const flattenNodes = (node: PositionedVisualNode): PositionedVisualNode[] => [
  node,
  ...(node.children ? node.children.flatMap(flattenNodes) : []),
];

export const renderExcalidrawScene = (
  root: PositionedVisualNode,
  options?: RenderOptions
): ExcalidrawScene => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const theme = DARK_THEME;
  const clusterColorByNodeId = new Map<string, string>();
  const topLevel = root.children || [];
  const rootColor = "#343a40";
  clusterColorByNodeId.set(root.id, rootColor);
  topLevel.forEach((branch, index) => {
    const color = CLUSTER_PALETTE[index % CLUSTER_PALETTE.length];
    const assignColor = (node: PositionedVisualNode) => {
      clusterColorByNodeId.set(node.id, color);
      (node.children || []).forEach(assignColor);
    };
    assignColor(branch);
  });
  const nodes = flattenNodes(root);
  const elements: any[] = [];

  nodes.forEach((node) => {
    const rectId = `rect-${node.id}`;
    const textId = `text-${node.id}`;
    const isRoot = node.id === root.id;
    const nodeStroke = clusterColorByNodeId.get(node.id) || (isRoot ? theme.stroke : theme.stroke);
    elements.push(createRectangle(node, textId, opts, theme, nodeStroke));
    const nodeText = clusterColorByNodeId.get(node.id) || (isRoot ? theme.text : theme.text);
    elements.push(createText(node, rectId, opts, theme, nodeText));
  });

  const addEdges = (parent: PositionedVisualNode) => {
    (parent.children || []).forEach((child) => {
      const isRoot = parent.id === root.id;
      const edgeColor = isRoot
        ? clusterColorByNodeId.get(child.id)
        : clusterColorByNodeId.get(parent.id);
      elements.push(createArrow(parent, child, opts, theme, edgeColor));
      addEdges(child);
    });
  };
  addEdges(root);

  return {
    type: "excalidraw",
    version: 2,
    source: "studio-visual-diagram",
    elements,
    appState: {
      viewBackgroundColor: DARK_THEME.background,
      theme: "dark",
      currentItemStrokeColor: DARK_THEME.stroke,
      currentItemBackgroundColor: opts.fillColor,
      currentItemTextColor: DARK_THEME.text,
      currentItemArrowColor: DARK_THEME.arrow,
    },
    files: {},
  };
};
