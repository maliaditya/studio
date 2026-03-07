import aliasesCatalog from "@/lib/shiv/catalog/aliases.json";
import stopwordsCatalog from "@/lib/shiv/catalog/stopwords.json";
import { normalizeText, safeString, unique } from "@/lib/shiv/normalize";

export const MAX_ALIASES_PER_TASK = 12;

const STOPWORDS = new Set(
  Array.isArray((stopwordsCatalog as { words?: unknown }).words)
    ? ((stopwordsCatalog as { words?: string[] }).words || []).map((w) => String(w).toLowerCase())
    : []
);

type AliasMap = Record<string, string[]>;

const asAliasArray = (value: unknown) =>
  (Array.isArray(value) ? value : [])
    .map((item) => safeString(item).trim())
    .filter(Boolean);

export const getStaticTaskAliasMap = (): AliasMap => {
  const taskAliases = ((aliasesCatalog as Record<string, unknown>).taskAliases || {}) as Record<string, unknown>;
  return normalizeTaskAliasMap(taskAliases, MAX_ALIASES_PER_TASK);
};

export const normalizeTaskAliasMap = (raw: Record<string, unknown> | undefined, maxPerTask = MAX_ALIASES_PER_TASK): AliasMap => {
  const out: AliasMap = {};
  for (const [rawKey, rawValues] of Object.entries(raw || {})) {
    const keyNorm = normalizeText(rawKey);
    if (!keyNorm) continue;
    const merged = unique(
      asAliasArray(rawValues)
        .map((alias) => normalizeText(alias))
        .filter(Boolean)
    ).slice(0, maxPerTask);
    if (merged.length > 0) {
      out[keyNorm] = merged;
    }
  }
  return out;
};

export const mergeTaskAliasMaps = (
  base: Record<string, unknown> | undefined,
  incoming: Record<string, unknown> | undefined,
  maxPerTask = MAX_ALIASES_PER_TASK
): AliasMap => {
  const baseNorm = normalizeTaskAliasMap(base, maxPerTask);
  const inNorm = normalizeTaskAliasMap(incoming, maxPerTask);
  const out: AliasMap = { ...baseNorm };

  for (const [key, aliases] of Object.entries(inNorm)) {
    const next = unique([...(out[key] || []), ...aliases]);
    out[key] = next.slice(0, maxPerTask);
  }

  return out;
};

export const sanitizeGeneratedTaskAliases = (
  generated: Record<string, unknown> | undefined,
  canonicalTaskNames: string[],
  maxPerTask = MAX_ALIASES_PER_TASK
): AliasMap => {
  const canonicalByNorm = new Map<string, string>();
  for (const name of canonicalTaskNames) {
    const norm = normalizeText(name);
    if (!norm) continue;
    canonicalByNorm.set(norm, name);
  }

  const out: AliasMap = {};
  for (const [rawKey, rawValues] of Object.entries(generated || {})) {
    const keyNorm = normalizeText(rawKey);
    if (!keyNorm) continue;

    let targetKey = keyNorm;
    if (!canonicalByNorm.has(targetKey)) {
      for (const canonicalNorm of canonicalByNorm.keys()) {
        if (canonicalNorm.includes(keyNorm) || keyNorm.includes(canonicalNorm)) {
          targetKey = canonicalNorm;
          break;
        }
      }
    }
    if (!canonicalByNorm.has(targetKey)) continue;

    const cleaned = unique(
      asAliasArray(rawValues)
        .map((alias) => normalizeText(alias))
        .filter((alias) => {
          if (!alias || alias.length <= 1 || alias.length > 60) return false;
          if (/^\W+$/.test(alias)) return false;
          if (alias === targetKey) return false;
          if (STOPWORDS.has(alias)) return false;
          return true;
        })
    ).slice(0, maxPerTask);

    if (cleaned.length > 0) {
      out[targetKey] = unique([...(out[targetKey] || []), ...cleaned]).slice(0, maxPerTask);
    }
  }

  return out;
};

export const buildAliasLookupForName = (name: string, mergedAliasMap: Record<string, unknown>): string[] => {
  const norm = normalizeText(name);
  if (!norm) return unique([safeString(name).trim()].filter(Boolean));

  const normalizedMap = normalizeTaskAliasMap(mergedAliasMap, MAX_ALIASES_PER_TASK);
  const out: string[] = [safeString(name).trim()];

  for (const [canonical, aliases] of Object.entries(normalizedMap)) {
    const isMatch = canonical === norm || aliases.some((alias) => alias === norm);
    if (isMatch) {
      out.push(canonical, ...aliases);
    }
  }

  return unique(out.map((value) => safeString(value).trim().toLowerCase()).filter(Boolean));
};
