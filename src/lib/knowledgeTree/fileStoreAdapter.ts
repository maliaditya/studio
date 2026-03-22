import fs from "node:fs/promises";
import path from "node:path";
import type { KnowledgeGraph } from "./types";
import type { KnowledgeStoreAdapter } from "./knowledgeStore";

export class FileStoreAdapter implements KnowledgeStoreAdapter {
  constructor(private filePath: string) {}

  async load(): Promise<KnowledgeGraph | null> {
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as KnowledgeGraph;
      if (!parsed || typeof parsed !== "object") return null;
      return parsed;
    } catch (error: any) {
      if (error?.code === "ENOENT") return null;
      throw error;
    }
  }

  async save(graph: KnowledgeGraph): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(graph, null, 2), "utf8");
  }
}
