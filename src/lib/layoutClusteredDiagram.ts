import type { VisualNode } from "./planVisualDiagram";

export type PositionedVisualNode = VisualNode & {
  x: number;
  y: number;
  width: number;
  height: number;
  children?: PositionedVisualNode[];
};

type LayoutOptions = {
  fontSize?: number;
  charWidth?: number;
  paddingX?: number;
  paddingY?: number;
  minWidth?: number;
  minHeight?: number;
  clusterGap?: number;
  siblingGap?: number;
  rootRadius?: number;
  margin?: number;
};

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  fontSize: 16,
  charWidth: 7,
  paddingX: 18,
  paddingY: 12,
  minWidth: 150,
  minHeight: 48,
  clusterGap: 56,
  siblingGap: 28,
  rootRadius: 260,
  margin: 40,
};

const buildLines = (node: VisualNode) => {
  const lines: string[] = [];
  if (node.kind === "content") {
    lines.push(node.title);
    (node.items || []).forEach((item) => {
      lines.push(`• ${item}`);
    });
    return lines;
  }
  if (node.kind === "note") {
    lines.push(node.title);
    (node.items || []).forEach((item) => {
      lines.push(`• ${item}`);
    });
    return lines;
  }
  lines.push(node.title);
  return lines;
};

const measureNode = (node: VisualNode, opts: Required<LayoutOptions>) => {
  const lines = buildLines(node);
  const maxLineLength = Math.max(1, ...lines.map((line) => line.length));
  const width = Math.max(
    opts.minWidth,
    maxLineLength * opts.charWidth + opts.paddingX * 2
  );
  const lineHeight = opts.fontSize * 1.25;
  const height = Math.max(
    opts.minHeight,
    lines.length * lineHeight + opts.paddingY * 2
  );
  return { width, height };
};

const cloneTree = (node: VisualNode, opts: Required<LayoutOptions>): PositionedVisualNode => {
  const size = measureNode(node, opts);
  const children = node.children ? node.children.map((child) => cloneTree(child, opts)) : undefined;
  return {
    ...node,
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    children,
  };
};

const shouldUseRadialLayout = (
  parent: PositionedVisualNode,
  opts: Required<LayoutOptions>
) => {
  const children = parent.children || [];
  if (children.length <= 4) return false;

  const totalWidth = children.reduce((sum, child) => sum + child.width, 0);
  const totalHeight = children.reduce((sum, child) => sum + child.height, 0);
  const avgWidth = totalWidth / Math.max(1, children.length);
  const avgHeight = totalHeight / Math.max(1, children.length);
  const estimatedRowWidth = totalWidth + opts.siblingGap * Math.max(0, children.length - 1);
  const estimatedColumnHeight =
    totalHeight + opts.siblingGap * Math.max(0, children.length - 1);

  if (children.length >= 6) return true;
  if (children.length >= 5 && (avgWidth >= 220 || avgHeight >= 120)) return true;
  if (children.length >= 5 && (estimatedRowWidth >= 860 || estimatedColumnHeight >= 720))
    return true;
  return false;
};

const placeClusterChildren = (
  parent: PositionedVisualNode,
  dir: { x: number; y: number },
  opts: Required<LayoutOptions>
) => {
  const children = parent.children || [];
  if (children.length === 0) return;

  if (shouldUseRadialLayout(parent, opts)) {
    const centerX = parent.x + parent.width / 2;
    const centerY = parent.y + parent.height / 2;
    const avgSize =
      children.reduce((sum, child) => sum + Math.max(child.width, child.height), 0) /
      Math.max(1, children.length);
    const circumferenceTarget = children.reduce((sum, child) => sum + child.width, 0);
    const minRadius =
      Math.max(parent.width, parent.height) / 2 + opts.clusterGap + avgSize * 0.2;
    const radius = Math.max(minRadius, circumferenceTarget / (2 * Math.PI) + avgSize * 0.2);
    const baseAngle = Math.atan2(dir.y, dir.x) - Math.PI / 2;
    const angleStep = (Math.PI * 2) / children.length;

    children.forEach((child, index) => {
      const angle = baseAngle + angleStep * index;
      const childCenterX = centerX + Math.cos(angle) * radius;
      const childCenterY = centerY + Math.sin(angle) * radius;
      child.x = childCenterX - child.width / 2;
      child.y = childCenterY - child.height / 2;
    });

    children.forEach((child) => {
      const childCenterX = child.x + child.width / 2;
      const childCenterY = child.y + child.height / 2;
      placeClusterChildren(
        child,
        { x: childCenterX - centerX, y: childCenterY - centerY },
        opts
      );
    });
    return;
  }

  const horizontal = Math.abs(dir.x) >= Math.abs(dir.y);
  if (horizontal) {
    const toRight = dir.x >= 0;
    const totalHeight =
      children.reduce((sum, child) => sum + child.height, 0) +
      opts.siblingGap * Math.max(0, children.length - 1);
    let cursor = parent.y + parent.height / 2 - totalHeight / 2;
    const baseX = toRight
      ? parent.x + parent.width + opts.clusterGap
      : parent.x - opts.clusterGap;

    children.forEach((child) => {
      child.x = toRight ? baseX : baseX - child.width;
      child.y = cursor;
      cursor += child.height + opts.siblingGap;
    });

    children.forEach((child) => {
      placeClusterChildren(child, { x: toRight ? 1 : -1, y: 0 }, opts);
    });
    return;
  }

  const toBottom = dir.y >= 0;
  const totalWidth =
    children.reduce((sum, child) => sum + child.width, 0) +
    opts.siblingGap * Math.max(0, children.length - 1);
  let cursor = parent.x + parent.width / 2 - totalWidth / 2;
  const baseY = toBottom
    ? parent.y + parent.height + opts.clusterGap
    : parent.y - opts.clusterGap;

  children.forEach((child) => {
    child.x = cursor;
    child.y = toBottom ? baseY : baseY - child.height;
    cursor += child.width + opts.siblingGap;
  });

  children.forEach((child) => {
    placeClusterChildren(child, { x: 0, y: toBottom ? 1 : -1 }, opts);
  });
};

const boundsOfTree = (node: PositionedVisualNode) => {
  let minX = node.x;
  let minY = node.y;
  let maxX = node.x + node.width;
  let maxY = node.y + node.height;
  (node.children || []).forEach((child) => {
    const bounds = boundsOfTree(child);
    minX = Math.min(minX, bounds.minX);
    minY = Math.min(minY, bounds.minY);
    maxX = Math.max(maxX, bounds.maxX);
    maxY = Math.max(maxY, bounds.maxY);
  });
  return { minX, minY, maxX, maxY };
};

const shiftTree = (node: PositionedVisualNode, dx: number, dy: number) => {
  node.x += dx;
  node.y += dy;
  (node.children || []).forEach((child) => shiftTree(child, dx, dy));
};

const expandBounds = (
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  margin: number
) => ({
  minX: bounds.minX - margin,
  minY: bounds.minY - margin,
  maxX: bounds.maxX + margin,
  maxY: bounds.maxY + margin,
});

const overlaps = (
  a: { minX: number; minY: number; maxX: number; maxY: number },
  b: { minX: number; minY: number; maxX: number; maxY: number }
) =>
  a.minX < b.maxX &&
  a.maxX > b.minX &&
  a.minY < b.maxY &&
  a.maxY > b.minY;

const centerOf = (bounds: { minX: number; minY: number; maxX: number; maxY: number }) => ({
  x: (bounds.minX + bounds.maxX) / 2,
  y: (bounds.minY + bounds.maxY) / 2,
});

export const layoutClusteredDiagram = (
  root: VisualNode,
  opts?: LayoutOptions
): PositionedVisualNode => {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const layoutRoot = cloneTree(root, options);
  layoutRoot.x = 0;
  layoutRoot.y = 0;

  const firstLevel = layoutRoot.children || [];
  const count = Math.max(1, firstLevel.length);
  const baseRadius = options.rootRadius + Math.max(0, count - 4) * 32;
  const angleStep = (Math.PI * 2) / count;
  const baseAngle = -Math.PI / 2;

  const branchAngles = firstLevel.map((_, index) => baseAngle + angleStep * index);
  const branchRadii = firstLevel.map(() => baseRadius);

  const positionBranches = () => {
    firstLevel.forEach((child, index) => {
      const angle = branchAngles[index];
      const radius = branchRadii[index];
      const centerX = Math.cos(angle) * radius;
      const centerY = Math.sin(angle) * radius;
      child.x = centerX - child.width / 2;
      child.y = centerY - child.height / 2;
      placeClusterChildren(child, { x: Math.cos(angle), y: Math.sin(angle) }, options);
    });
  };

  positionBranches();

  // Resolve overlaps by expanding crowded branches outward, then nudging angles.
  const maxIterations = 18;
  const minMargin = 18;
  for (let iter = 0; iter < maxIterations; iter += 1) {
    const branchBounds = firstLevel.map((branch) =>
      expandBounds(boundsOfTree(branch), minMargin)
    );
    let hadOverlap = false;

    for (let i = 0; i < branchBounds.length; i += 1) {
      for (let j = i + 1; j < branchBounds.length; j += 1) {
        if (!overlaps(branchBounds[i], branchBounds[j])) continue;
        hadOverlap = true;
        const centerA = centerOf(branchBounds[i]);
        const centerB = centerOf(branchBounds[j]);
        const dx = centerA.x - centerB.x;
        const dy = centerA.y - centerB.y;
        const push = Math.max(22, Math.min(60, Math.hypot(dx, dy) * 0.2));
        branchRadii[i] += push * 0.6;
        branchRadii[j] += push * 0.6;

        // Small angular nudge to reduce tangles if still tight.
        if (iter > 8) {
          const nudge = 0.04;
          branchAngles[i] += dx >= 0 ? nudge : -nudge;
          branchAngles[j] += dx >= 0 ? -nudge : nudge;
        }
      }
    }

    if (!hadOverlap) break;
    positionBranches();
  }

  const bounds = boundsOfTree(layoutRoot);
  const dx = options.margin - bounds.minX;
  const dy = options.margin - bounds.minY;
  shiftTree(layoutRoot, dx, dy);

  return layoutRoot;
};
