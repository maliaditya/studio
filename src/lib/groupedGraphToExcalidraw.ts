import type { GroupedGraphBlueprint, GroupedGraphNode } from "./groupedGraph";

export type PositionedGraphNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ExcalidrawScene = {
  type: "excalidraw";
  version: number;
  source: string;
  elements: any[];
  appState: Record<string, any>;
  files: Record<string, any>;
};

type SceneOptions = {
  fontSize?: number;
  strokeColor?: string;
  textColor?: string;
  arrowColor?: string;
  fillColor?: string;
  charWidth?: number;
  minWidth?: number;
  nodeHeight?: number;
  paddingX?: number;
  paddingY?: number;
  radiusMin?: number;
  radiusMax?: number;
  nodeSpacing?: number;
  margin?: number;
};

const DEFAULT_SCENE_OPTIONS: Required<SceneOptions> = {
  fontSize: 16,
  strokeColor: "#ffffff",
  textColor: "#ffffff",
  arrowColor: "#ffffff",
  fillColor: "transparent",
  charWidth: 7,
  minWidth: 150,
  nodeHeight: 48,
  paddingX: 16,
  paddingY: 10,
  radiusMin: 360,
  radiusMax: 460,
  nodeSpacing: 90,
  margin: 40,
};

const hashSeed = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
};

const measureNode = (label: string, opts: Required<SceneOptions>) => {
  const width = Math.max(
    opts.minWidth,
    label.length * opts.charWidth + opts.paddingX * 2
  );
  return { width, height: opts.nodeHeight };
};

const computeRadius = (clusterCount: number, opts: Required<SceneOptions>) => {
  if (clusterCount <= 1) return opts.radiusMin;
  const extra = Math.min(
    opts.radiusMax - opts.radiusMin,
    Math.max(0, clusterCount - 4) * 25
  );
  return opts.radiusMin + extra;
};

const polarToCartesian = (r: number, angleRad: number) => ({
  x: r * Math.cos(angleRad),
  y: r * Math.sin(angleRad),
});

const buildNodeMap = (
  blueprint: GroupedGraphBlueprint,
  opts: Required<SceneOptions>
) => {
  const nodes = new Map<string, PositionedGraphNode>();
  const rootSize = measureNode(blueprint.root.label, opts);
  nodes.set(blueprint.root.id, {
    id: blueprint.root.id,
    label: blueprint.root.label,
    x: 0,
    y: 0,
    width: rootSize.width,
    height: rootSize.height,
  });

  blueprint.clusters.forEach((cluster) => {
    const size = measureNode(cluster.label, opts);
    nodes.set(cluster.id, {
      id: cluster.id,
      label: cluster.label,
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
    cluster.nodes.forEach((node) => {
      const nodeSize = measureNode(node.label, opts);
      nodes.set(node.id, {
        id: node.id,
        label: node.label,
        x: 0,
        y: 0,
        width: nodeSize.width,
        height: nodeSize.height,
      });
    });
  });

  return nodes;
};

const layoutRadialGraph = (
  blueprint: GroupedGraphBlueprint,
  opts: Required<SceneOptions>
) => {
  const nodes = buildNodeMap(blueprint, opts);
  const root = nodes.get(blueprint.root.id);
  if (!root) return { nodes, bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };

  const clusterCount = blueprint.clusters.length || 1;
  const radius = computeRadius(clusterCount, opts);
  const angleStep = (Math.PI * 2) / clusterCount;
  const baseAngle = -Math.PI / 2;

  blueprint.clusters.forEach((cluster, index) => {
    const angle = baseAngle + angleStep * index;
    const offset = polarToCartesian(radius, angle);
    const clusterNode = nodes.get(cluster.id);
    if (!clusterNode) return;
    clusterNode.x = offset.x - clusterNode.width / 2;
    clusterNode.y = offset.y - clusterNode.height / 2;

    const radialDir = polarToCartesian(1, angle);
    cluster.nodes.forEach((child, childIndex) => {
      const childNode = nodes.get(child.id);
      if (!childNode) return;
      const distance = opts.nodeSpacing * (childIndex + 1);
      const childCenterX =
        offset.x + radialDir.x * distance;
      const childCenterY =
        offset.y + radialDir.y * distance;
      childNode.x = childCenterX - childNode.width / 2;
      childNode.y = childCenterY - childNode.height / 2;
    });
  });

  let minX = root.x;
  let minY = root.y;
  let maxX = root.x + root.width;
  let maxY = root.y + root.height;
  nodes.forEach((node) => {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  });

  const dx = opts.margin - minX;
  const dy = opts.margin - minY;
  nodes.forEach((node) => {
    node.x += dx;
    node.y += dy;
  });

  return { nodes, bounds: { minX, minY, maxX, maxY } };
};

const createRectangle = (
  node: PositionedGraphNode,
  textId: string,
  opts: Required<SceneOptions>
) => {
  const seed = hashSeed(node.id);
  return {
    id: `rect-${node.id}`,
    type: "rectangle",
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    angle: 0,
    strokeColor: opts.strokeColor,
    backgroundColor: opts.fillColor,
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
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
  node: PositionedGraphNode,
  rectId: string,
  opts: Required<SceneOptions>
) => {
  const seed = hashSeed(`text-${node.id}`);
  const textWidth = Math.max(1, node.label.length) * opts.charWidth;
  const textHeight = opts.fontSize * 1.2;
  const textX = node.x + (node.width - textWidth) / 2;
  const textY = node.y + (node.height - textHeight) / 2;
  return {
    id: `text-${node.id}`,
    type: "text",
    x: textX,
    y: textY,
    width: textWidth,
    height: textHeight,
    angle: 0,
    strokeColor: opts.textColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
    strokeStyle: "solid",
    roughness: 0,
    opacity: 100,
    groupIds: [],
    strokeSharpness: "sharp",
    seed,
    version: 1,
    versionNonce: seed,
    isDeleted: false,
    text: node.label,
    fontSize: opts.fontSize,
    fontFamily: 1,
    textAlign: "center",
    verticalAlign: "middle",
    baseline: textHeight * 0.8,
    lineHeight: 1.2,
    containerId: rectId,
    originalText: node.label,
  };
};

const createArrow = (
  from: PositionedGraphNode,
  to: PositionedGraphNode,
  opts: Required<SceneOptions>
) => {
  const seed = hashSeed(`arrow-${from.id}-${to.id}`);
  const startX = from.x + from.width / 2;
  const startY = from.y + from.height / 2;
  const endX = to.x + to.width / 2;
  const endY = to.y + to.height / 2;
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
    strokeColor: opts.arrowColor,
    backgroundColor: "transparent",
    fillStyle: "solid",
    strokeWidth: 1,
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

const getNodeFromMap = (
  id: string,
  nodes: Map<string, PositionedGraphNode>
) => nodes.get(id) || null;

export const groupedGraphToExcalidraw = (
  blueprint: GroupedGraphBlueprint,
  options?: SceneOptions
): ExcalidrawScene => {
  const opts = { ...DEFAULT_SCENE_OPTIONS, ...options };
  const { nodes } = layoutRadialGraph(blueprint, opts);
  const elements: any[] = [];

  nodes.forEach((node) => {
    const rectId = `rect-${node.id}`;
    const textId = `text-${node.id}`;
    elements.push(createRectangle(node, textId, opts));
    elements.push(createText(node, rectId, opts));
  });

  blueprint.edges.forEach((edge) => {
    const from = getNodeFromMap(edge.from, nodes);
    const to = getNodeFromMap(edge.to, nodes);
    if (!from || !to) return;
    elements.push(createArrow(from, to, opts));
  });

  return {
    type: "excalidraw",
    version: 2,
    source: "studio-grouped-graph",
    elements,
    appState: {
      viewBackgroundColor: "#0b0b0f",
    },
    files: {},
  };
};
