const parseAdminUsernames = (raw: string | undefined): string[] =>
  String(raw || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

export const getAdminUsernames = (): string[] => {
  const values = [
    ...parseAdminUsernames(process.env.ADMIN_USERNAMES),
    ...parseAdminUsernames(process.env.NEXT_PUBLIC_ADMIN_USERNAMES),
  ];

  if (values.length === 0) {
    return ['lonewolf'];
  }

  return Array.from(new Set(values));
};

export const isAdminUsername = (username: string | null | undefined): boolean => {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  if (!normalizedUsername) return false;
  return getAdminUsernames().includes(normalizedUsername);
};