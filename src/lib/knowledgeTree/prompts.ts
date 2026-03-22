export const PROMPT_TEMPLATES = {
  treeExtraction:
    "Extract a clean ASCII tree from the content. Use a single root and keep labels concise. Output only the tree.",
  nodeNormalization:
    "Normalize node labels by removing filler words, fixing casing, and keeping concepts short and canonical. Output JSON mapping original -> normalized.",
  nodeMergeDecision:
    "Decide if two concept labels refer to the same underlying concept. Reply with one of: identical, related, distinct. Provide a confidence score.",
  parentChildValidation:
    "Validate whether the parent-child relation is correct. Reply valid/invalid/uncertain with a brief reason.",
};
