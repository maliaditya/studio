import path from "node:path";

const sanitizeKey = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, "_");

export const resolveKnowledgeTreePath = (canvasId?: string) => {
  const key = canvasId && canvasId.trim() ? sanitizeKey(canvasId.trim()) : "global";
  return path.join(process.cwd(), ".idx", "knowledge-tree", `${key}.json`);
};
