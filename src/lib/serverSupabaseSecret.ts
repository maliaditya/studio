import { head, put } from '@vercel/blob';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const blobPathForUser = (username: string) => `supabase-secrets/${username}.json`;

const getEncryptionKey = () => {
  const secret =
    process.env.LIFEOS_SETTINGS_ENCRYPTION_KEY ||
    process.env.LIFEOS_SESSION_SECRET ||
    process.env.BLOB_READ_WRITE_TOKEN ||
    'lifeos-dev-settings-key';
  return createHash('sha256').update(secret).digest();
};

const encrypt = (plainText: string) => {
  const iv = randomBytes(12);
  const key = getEncryptionKey();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    content: encrypted.toString('base64'),
  };
};

export async function saveSupabaseServiceKeyForUser(username: string, serviceRoleKey: string): Promise<void> {
  const payload = {
    version: 1,
    createdAt: new Date().toISOString(),
    encrypted: encrypt(String(serviceRoleKey)),
  };
  await put(blobPathForUser(username), JSON.stringify(payload, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
  });
}

export async function hasSupabaseServiceKeyForUser(username: string): Promise<boolean> {
  try {
    await head(blobPathForUser(username));
    return true;
  } catch {
    return false;
  }
}

export async function decryptSupabaseServiceKeyForUser(username: string): Promise<string | null> {
  try {
    const blob = await head(blobPathForUser(username));
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    const data = await response.json();
    const encrypted = data?.encrypted;
    if (!encrypted?.iv || !encrypted?.tag || !encrypted?.content) return null;

    const key = getEncryptionKey();
    const iv = Buffer.from(String(encrypted.iv), 'base64');
    const tag = Buffer.from(String(encrypted.tag), 'base64');
    const content = Buffer.from(String(encrypted.content), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(content), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

