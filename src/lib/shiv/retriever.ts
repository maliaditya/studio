import aliasesCatalog from "@/lib/shiv/catalog/aliases.json";
import { meaningfulStems, meaningfulTokens, normalizeText, tokenOverlapRatio } from "@/lib/shiv/normalize";
import type { Domain, ShivEntity, ShivEvidence, ShivIndex, ShivQuery } from "@/lib/shiv/types";

type RetrieveResult = {
  global: ShivEvidence[];
  byDomain: Record<Domain, ShivEvidence[]>;
};

const domainList: Domain[] = ["task", "routine", "bothering", "resource", "skill", "health", "canvas", "journal"];

const domainAliases = ((aliasesCatalog as Record<string, unknown>).domains || {}) as Record<string, string[]>;
const EMBED_DIM = 192;
const entityVectorCache = new Map<string, Float32Array>();
const entityTokenCache = new Map<string, string[]>();

const hashToken = (token: string) => {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return Math.abs(hash >>> 0);
};

const embedText = (value: string) => {
  const vec = new Float32Array(EMBED_DIM);
  const tokens = meaningfulStems(value);
  if (!tokens.length) return vec;
  for (const token of tokens) {
    const idx = hashToken(token) % EMBED_DIM;
    vec[idx] += 1;
  }
  let norm = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < EMBED_DIM; i += 1) vec[i] /= norm;
  return vec;
};

const cosine = (a: Float32Array, b: Float32Array) => {
  let sum = 0;
  for (let i = 0; i < EMBED_DIM; i += 1) sum += a[i] * b[i];
  return sum;
};

const buildDocTokenMap = (entity: ShivEntity) => meaningfulTokens(`${entity.name} ${entity.text} ${entity.aliases.join(" ")}`);

const buildBm25 = (queryTokens: string[], docsTokens: string[][]) => {
  const docsCount = docsTokens.length || 1;
  const avgLen = docsTokens.reduce((acc, tokens) => acc + tokens.length, 0) / docsCount || 1;
  const df = new Map<string, number>();
  docsTokens.forEach((tokens) => {
    const uniq = new Set(tokens);
    uniq.forEach((token) => {
      df.set(token, (df.get(token) || 0) + 1);
    });
  });

  const k1 = 1.5;
  const b = 0.75;

  return docsTokens.map((tokens) => {
    if (!queryTokens.length || !tokens.length) return 0;
    const tf = new Map<string, number>();
    tokens.forEach((token) => tf.set(token, (tf.get(token) || 0) + 1));
    let score = 0;
    for (const token of queryTokens) {
      const tokenDf = df.get(token) || 0;
      if (!tokenDf) continue;
      const idf = Math.log(1 + (docsCount - tokenDf + 0.5) / (tokenDf + 0.5));
      const freq = tf.get(token) || 0;
      if (!freq) continue;
      const denom = freq + k1 * (1 - b + b * (tokens.length / avgLen));
      score += idf * ((freq * (k1 + 1)) / denom);
    }
    return score;
  });
};

const rerankPairScore = (query: ShivQuery, evidence: ShivEvidence) => {
  const qNorm = query.normalizedQuestion;
  const eNorm = normalizeText(`${evidence.name} ${evidence.text} ${evidence.aliases.join(" ")}`);
  const qTokens = meaningfulTokens(query.question);
  const eTokens = meaningfulTokens(`${evidence.name} ${evidence.text}`);
  const overlap = tokenOverlapRatio(qTokens, eTokens);

  let score = evidence.score * 0.65 + overlap * 0.25;
  if (qNorm && eNorm && (qNorm.includes(normalizeText(evidence.name)) || normalizeText(evidence.name).includes(qNorm))) {
    score += 0.2;
  }
  if (evidence.matchReason.includes("alias")) score += 0.05;
  return score;
};

const domainBoost = (queryText: string, domain: Domain) => {
  const aliases = Array.isArray(domainAliases[domain]) ? domainAliases[domain] : [];
  const q = normalizeText(queryText);
  if (!q) return 0;
  for (const alias of aliases) {
    const token = normalizeText(alias);
    if (!token) continue;
    if (q.includes(token)) return 0.2;
  }
  return 0;
};

const scoreEntity = (query: ShivQuery, entity: ShivEntity): ShivEvidence => {
  const qNorm = query.normalizedQuestion;
  const eNameNorm = normalizeText(entity.name);
  const aliasNorms = entity.aliases.map((alias) => normalizeText(alias)).filter(Boolean);

  let score = 0;
  const reasons: string[] = [];

  if (qNorm && eNameNorm && (qNorm.includes(eNameNorm) || eNameNorm.includes(qNorm))) {
    score += 1.5;
    reasons.push("exact_phrase");
  }

  const aliasHit = aliasNorms.find((alias) => alias && (qNorm.includes(alias) || alias.includes(qNorm)));
  if (aliasHit) {
    score += 1.0;
    reasons.push("alias");
  }

  const qTokens = meaningfulTokens(query.question);
  const eTokens = meaningfulTokens(`${entity.name} ${entity.text} ${aliasNorms.join(" ")}`);
  const overlap = tokenOverlapRatio(qTokens, eTokens);
  if (overlap > 0) {
    score += overlap;
    reasons.push("token_overlap");
  }

  const qStems = meaningfulStems(query.question);
  const eStems = meaningfulStems(`${entity.name} ${entity.text} ${aliasNorms.join(" ")}`);
  const stemOverlap = tokenOverlapRatio(qStems, eStems);
  if (stemOverlap > 0) {
    score += stemOverlap * 0.75;
    reasons.push("stem_overlap");
  }

  const boost = domainBoost(query.question, entity.domain);
  if (boost > 0) {
    score += boost;
    reasons.push("domain_cue");
  }

  if (query.meaningfulTokens.length <= 2 && aliasHit) {
    score += 0.2;
  }

  return {
    ...entity,
    score,
    matchReason: reasons.join("+") || "weak",
  };
};

const sortEvidence = (items: ShivEvidence[]) =>
  [...items].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.name.localeCompare(b.name);
  });

export const retrieveEvidence = (query: ShivQuery, index: ShivIndex): RetrieveResult => {
  const baseScored = index.entities.map((entity) => scoreEntity(query, entity));
  const docsTokens = index.entities.map((entity) => {
    const key = `${entity.id}:${entity.name}:${entity.text}`;
    const cached = entityTokenCache.get(key);
    if (cached) return cached;
    const tokens = buildDocTokenMap(entity);
    entityTokenCache.set(key, tokens);
    return tokens;
  });
  const bm25Scores = buildBm25(meaningfulTokens(query.question), docsTokens);
  const qVec = embedText(query.question);
  const semScores = index.entities.map((entity) => {
    const key = `${entity.id}:${entity.name}:${entity.text}`;
    const eVec = entityVectorCache.get(key) || embedText(`${entity.name} ${entity.text} ${entity.aliases.join(" ")}`);
    if (!entityVectorCache.has(key)) entityVectorCache.set(key, eVec);
    return Math.max(0, cosine(qVec, eVec));
  });

  let maxBm25 = 0;
  for (const s of bm25Scores) maxBm25 = Math.max(maxBm25, s);
  const normalizedBm25 = bm25Scores.map((s) => (maxBm25 > 0 ? s / maxBm25 : 0));

  const scored = baseScored.map((entry, idx) => {
    const hybrid = entry.score * 0.5 + normalizedBm25[idx] * 0.3 + semScores[idx] * 0.2;
    const reasons = [entry.matchReason, normalizedBm25[idx] > 0 ? "bm25" : "", semScores[idx] > 0.05 ? "vector" : ""]
      .filter(Boolean)
      .join("+");
    return {
      ...entry,
      score: hybrid,
      matchReason: reasons || entry.matchReason,
    };
  });

  const reranked = sortEvidence(scored)
    .slice(0, 40)
    .map((entry) => ({ ...entry, score: rerankPairScore(query, entry), matchReason: `${entry.matchReason}+rerank` }));

  const global = sortEvidence(reranked)
    .filter((entry) => entry.score > 0.05)
    .slice(0, 30);

  const byDomain = {
    task: [] as ShivEvidence[],
    routine: [] as ShivEvidence[],
    bothering: [] as ShivEvidence[],
    resource: [] as ShivEvidence[],
    skill: [] as ShivEvidence[],
    health: [] as ShivEvidence[],
    canvas: [] as ShivEvidence[],
    journal: [] as ShivEvidence[],
  };

  for (const domain of domainList) {
    byDomain[domain] = sortEvidence(
      reranked.filter((entry) => entry.domain === domain && entry.score > 0.01)
    ).slice(0, 10);
  }

  return { global, byDomain };
};

export const bestDomainFromEvidence = (result: RetrieveResult): Domain | null => {
  let best: Domain | null = null;
  let bestScore = 0;
  for (const domain of domainList) {
    const top = result.byDomain[domain][0];
    if (top && top.score > bestScore) {
      bestScore = top.score;
      best = domain;
    }
  }
  return best;
};
