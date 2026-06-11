import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
function getEncryptionKey(): Buffer {
  const secret = process.env.APP_SECRET || "vaultbase-default-dev-secret-key-12345!";
  return crypto.createHash("sha256").update(secret).digest();
}

const IV_LENGTH = 16; // For AES, this is always 16

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

export function decrypt(text: string): string {
  if (!text || !text.includes(":")) {
    return "";
  }
  try {
    const textParts = text.split(":");
    const ivStr = textParts.shift() || "";
    const encryptedStr = textParts.join(":");
    if (!ivStr || !encryptedStr) return "";

    const iv = Buffer.from(ivStr, "hex");
    const encryptedText = Buffer.from(encryptedStr, "hex");

    if (iv.length !== 16) {
      return "";
    }

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error: any) {
    console.warn("Decryption failed (possibly mismatched APP_SECRET):", error.message || error);
    return "";
  }
}
