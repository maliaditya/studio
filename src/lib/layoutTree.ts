import type { DiagramNode } from "./parseConsoleDiagram";

export type PositionedNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  children: PositionedNode[];
};

type LayoutNode = PositionedNode & {
  subtreeWidth: number;
};

export type TreeLayoutOptions = {
  nodeHeight?: number;
  minWidth?: number;
  paddingX?: number;
  paddingY?: number;
  charWidth?: number;
  levelGap?: number;
  siblingGap?: number;
  margin?: number;
};

const DEFAULTS: Required<TreeLayoutOptions> = {
  nodeHeight: 48,
  minWidth: 140,
  paddingX: 16,
  paddingY: 10,
  charWidth: 7,
  levelGap: 80,
  siblingGap: 28,
  margin: 40,
};

const buildLayoutNode = (node: DiagramNode, path: number[]): LayoutNode => {
  const id = `node-${path.join("-") || "root"}`;
  const children = node.children.map((child, index) =>
    buildLayoutNode(child, [...path, index])
  );
  return {
    id,
    label: node.label,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    subtreeWidth: 0,
    children,
  };
};

const measureNode = (node: LayoutNode, options: Required<TreeLayoutOptions>) => {
  const { minWidth, paddingX, charWidth, nodeHeight, siblingGap } = options;
  const textWidth = Math.max(1, node.label.length) * charWidth;
  const width = Math.max(minWidth, textWidth + paddingX * 2);
  node.width = width;
  node.height = nodeHeight;

  if (node.children.length === 0) {
    node.subtreeWidth = width;
    return width;
  }

  const childWidths = node.children.map((child) => measureNode(child, options));
  const totalChildrenWidth =
    childWidths.reduce((sum, value) => sum + value, 0) +
    siblingGap * Math.max(0, childWidths.length - 1);
  node.subtreeWidth = Math.max(width, totalChildrenWidth);
  return node.subtreeWidth;
};

const placeNode = (
  node: LayoutNode,
  centerX: number,
  topY: number,
  options: Required<TreeLayoutOptions>
) => {
  const { levelGap, siblingGap, nodeHeight } = options;
  node.x = centerX - node.width / 2;
  node.y = topY;

  if (node.children.length === 0) return;

  const totalChildrenWidth =
    node.children.reduce((sum, child) => sum + child.subtreeWidth, 0) +
    siblingGap * Math.max(0, node.children.length - 1);
  let cursor = centerX - totalChildrenWidth / 2;
  const nextY = topY + nodeHeight + levelGap;

  node.children.forEach((child) => {
    const childCenter = cursor + child.subtreeWidth / 2;
    placeNode(child, childCenter, nextY, options);
    cursor += child.subtreeWidth + siblingGap;
  });
};

const shiftTree = (node: LayoutNode, dx: number, dy: number) => {
  node.x += dx;
  node.y += dy;
  node.children.forEach((child) => shiftTree(child, dx, dy));
};

const boundsOfTree = (node: LayoutNode) => {
  let minX = node.x;
  let minY = node.y;
  let maxX = node.x + node.width;
  let maxY = node.y + node.height;
  node.children.forEach((child) => {
    const childBounds = boundsOfTree(child);
    minX = Math.min(minX, childBounds.minX);
    minY = Math.min(minY, childBounds.minY);
    maxX = Math.max(maxX, childBounds.maxX);
    maxY = Math.max(maxY, childBounds.maxY);
  });
  return { minX, minY, maxX, maxY };
};

export const layoutTree = (
  root: DiagramNode,
  opts?: TreeLayoutOptions
): PositionedNode => {
  const options = { ...DEFAULTS, ...opts };
  const layoutRoot = buildLayoutNode(root, []);
  measureNode(layoutRoot, options);
  placeNode(layoutRoot, 0, 0, options);

  const bounds = boundsOfTree(layoutRoot);
  const dx = options.margin - bounds.minX;
  const dy = options.margin - bounds.minY;
  shiftTree(layoutRoot, dx, dy);

  const stripLayout = (node: LayoutNode): PositionedNode => ({
    id: node.id,
    label: node.label,
    x: node.x,
    y: node.y,
    width: node.width,
    height: node.height,
    children: node.children.map(stripLayout),
  });

  return stripLayout(layoutRoot);
};
