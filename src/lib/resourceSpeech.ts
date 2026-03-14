import type { Resource } from "@/types/workout";

const compact = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

export const buildReadableTextFromResource = (resource: Resource | null | undefined) => {
  if (!resource) return "";

  if (resource.type === "flashcard" && resource.flashcard) {
    const options = Array.isArray(resource.flashcard.options)
      ? resource.flashcard.options
          .map((option, index) => {
            const text = compact(option);
            if (!text) return "";
            return `Option ${String.fromCharCode(65 + index)}. ${text}.`;
          })
          .filter(Boolean)
          .join(" ")
      : "";

    return [
      compact(resource.name),
      compact(resource.flashcard.question),
      options,
      compact(resource.flashcard.explanation),
    ]
      .filter(Boolean)
      .join(". ");
  }

  const pointText = (resource.points || [])
    .map((point) => compact(point.displayText || point.text))
    .filter(Boolean)
    .join(". ");

  return [
    compact(resource.name),
    compact(resource.description),
    pointText,
  ]
    .filter(Boolean)
    .join(". ");
};
