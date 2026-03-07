export const formatDisplayDate = (dateKey: string | null | undefined) => {
  if (!dateKey) return "unknown date";
  const d = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(dateKey);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate();
  const year = d.getFullYear();
  return `${month} ${day} - ${year}`;
};

export const formatRemaining = (daysRaw: number) => {
  const days = Math.max(0, Math.floor(daysRaw));
  const weeks = Number((days / 7).toFixed(1));
  const months = Number((days / 30).toFixed(1));
  return {
    days,
    weeks,
    months,
    text: `${days} days (about ${weeks} weeks or ${months} months)`,
  };
};

export const dedupeLines = (lines: string[]) => {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(line.trim());
  }
  return out;
};
