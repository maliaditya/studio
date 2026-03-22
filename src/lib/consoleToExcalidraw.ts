import { parseConsoleDiagram } from "./parseConsoleDiagram";
import { planVisualDiagram } from "./planVisualDiagram";
import { layoutClusteredDiagram } from "./layoutClusteredDiagram";
import { renderExcalidrawScene, type ExcalidrawScene } from "./renderExcalidraw";

export const consoleDiagramToExcalidraw = (
  diagramText: string
): ExcalidrawScene => {
  const root = parseConsoleDiagram(diagramText);
  if (!root) {
    throw new Error("Diagram parsing failed.");
  }

  const planned = planVisualDiagram(root);
  const positioned = layoutClusteredDiagram(planned);
  return renderExcalidrawScene(positioned);
};
