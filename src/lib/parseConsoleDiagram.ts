export type DiagramNode = {
  label: string;
  children: DiagramNode[];
};

const HEADER_RE = /^diagram\b[:\s-]*$/i;
const CONNECTOR_RE =
  /^(?<prefix>(?:\s{3}|│\s{2}|\|\s{2})*)(?<connector>├─|└─|\+-|\\-)\s?(?<label>.*)$/;

const normalizeLabel = (value: string) => value.replace(/\s+/g, " ").trim();

const countDepth = (prefix: string) => {
  const matches = prefix.match(/(?:\s{3}|│\s{2}|\|\s{2})/g);
  return matches ? matches.length : 0;
};

export const parseConsoleDiagram = (input: string): DiagramNode | null => {
  if (!input) return null;
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.replace(/\t/g, "   "))
    .map((line) => line.replace(/\s+$/, ""));

  let root: DiagramNode | null = null;
  const stack: Array<{ node: DiagramNode; depth: number }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    const plain = normalizeLabel(line);
    if (!root && HEADER_RE.test(plain)) continue;

    const match = CONNECTOR_RE.exec(line);
    if (!match || !match.groups) {
      if (!root) {
        const label = normalizeLabel(line);
        if (!label || HEADER_RE.test(label)) continue;
        root = { label, children: [] };
        stack.length = 0;
        stack.push({ node: root, depth: 0 });
      }
      continue;
    }

    const label = normalizeLabel(match.groups.label || "");
    if (!label || HEADER_RE.test(label)) continue;
    const depth = countDepth(match.groups.prefix || "");
    const node: DiagramNode = { label, children: [] };

    if (!root) {
      root = node;
      stack.length = 0;
      stack.push({ node, depth: 0 });
      continue;
    }

    while (stack.length && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    const parent = stack[stack.length - 1]?.node || root;
    parent.children.push(node);
    stack.push({ node, depth });
  }

  return root;
};
