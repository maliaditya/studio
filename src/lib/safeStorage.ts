export const isQuotaExceededStorageError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { name?: string; code?: number; message?: string };
  const name = maybeError.name || "";
  const code = maybeError.code;
  const message = (maybeError.message || "").toLowerCase();
  return (
    name === "QuotaExceededError" ||
    name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    code === 22 ||
    code === 1014 ||
    message.includes("quota") ||
    message.includes("exceeded")
  );
};

const safeSetStorageItem = (
  storage: Storage | null,
  key: string,
  value: string
) => {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

export const safeSetLocalStorageItem = (key: string, value: string) => {
  const storage = typeof window !== "undefined" ? window.localStorage : null;
  return safeSetStorageItem(storage, key, value);
};

export const safeSetSessionStorageItem = (key: string, value: string) => {
  const storage = typeof window !== "undefined" ? window.sessionStorage : null;
  return safeSetStorageItem(storage, key, value);
};
