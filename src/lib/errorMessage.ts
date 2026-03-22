const tryStringifyRecord = (value: Record<string, unknown>) => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

export const describeUnknownError = (error: unknown, fallback = 'An unknown error occurred.'): string => {
  if (typeof error === 'string') {
    const trimmed = error.trim();
    return trimmed || fallback;
  }

  if (error instanceof Error) {
    const trimmed = error.message.trim();
    return trimmed || fallback;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const nestedError = record.error;
    if (nestedError && nestedError !== error) {
      const nestedMessage = describeUnknownError(nestedError, '');
      if (nestedMessage) return nestedMessage;
    }

    const parts = [record.message, record.details, record.hint, record.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' | ');
    }

    const stringified = tryStringifyRecord(record).trim();
    return stringified && stringified !== '{}' ? stringified : fallback;
  }

  const message = String(error || '').trim();
  return message || fallback;
};