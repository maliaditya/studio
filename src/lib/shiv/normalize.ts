import stopwordsCatalog from "@/lib/shiv/catalog/stopwords.json";
import type { ShivLanguage } from "@/lib/shiv/types";

const STOPWORDS = new Set(
  Array.isArray((stopwordsCatalog as { words?: unknown }).words)
    ? ((stopwordsCatalog as { words?: string[] }).words || []).map((w) => String(w).toLowerCase())
    : []
);

const STEM_SUFFIXES = ["ing", "edly", "edly", "edly", "ed", "es", "s", "ly", "tion", "ions"];

export const toPlainText = (value: string) =>
  String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .trim();

export const normalizeText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const tokenize = (value: string) => normalizeText(value).split(" ").filter(Boolean);

export const stemLite = (token: string) => {
  let out = String(token || "").toLowerCase();
  if (out.length <= 3) return out;
  for (const suffix of STEM_SUFFIXES) {
    if (out.length > suffix.length + 2 && out.endsWith(suffix)) {
      out = out.slice(0, -suffix.length);
      break;
    }
  }
  return out;
};

export const meaningfulTokens = (value: string) =>
  tokenize(value).filter((token) => token && !STOPWORDS.has(token));

export const meaningfulStems = (value: string) => meaningfulTokens(value).map(stemLite);

export const unique = (values: string[]) => Array.from(new Set(values.filter(Boolean)));

export const detectUserLanguage = (text: string): ShivLanguage => {
  const value = String(text || "").toLowerCase();
  if (!value.trim()) return "english";
  if (/[\u0900-\u097f]/.test(value)) return "hindi";
  const hinglishHints = [
    "hai",
    "kya",
    "kaise",
    "nahi",
    "kar",
    "mera",
    "mujhe",
    "aaj",
    "kal",
    "tum",
    "main",
    "bata",
    "samjha",
  ];
  if (hinglishHints.some((hint) => value.includes(hint))) return "hinglish";
  if (/^[\x00-\x7f\s.,!?\"'`:\-]+$/.test(value)) return "english";
  return "auto";
};

export const tokenOverlapRatio = (a: string[], b: string[]) => {
  if (!a.length || !b.length) return 0;
  const bSet = new Set(b);
  let hit = 0;
  for (const token of a) {
    if (bSet.has(token)) hit += 1;
  }
  return hit / Math.max(1, a.length);
};

export const fuzzyIncludes = (haystack: string, needle: string) => {
  const h = normalizeText(haystack);
  const n = normalizeText(needle);
  if (!h || !n) return false;
  if (h.includes(n) || n.includes(h)) return true;
  const hStems = new Set(meaningfulStems(h));
  const nStems = meaningfulStems(n);
  if (!hStems.size || !nStems.length) return false;
  let shared = 0;
  for (const stem of nStems) {
    if (hStems.has(stem)) shared += 1;
  }
  return shared >= Math.max(1, Math.ceil(nStems.length * 0.6));
};

export const safeString = (value: unknown) => String(value ?? "");

export const normalizeDateKey = (value: unknown) => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return "";
  return raw;
};
