import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;
const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEY_LENGTH = 32;

function getEncryptionKey(): Buffer {
  const secret = process.env.APP_SECRET || "vaultbase-default-dev-secret-key-12345!";
  return crypto.createHash("sha256").update(secret).digest();
}

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

export function encryptWithPassword(text: string, password: string): { salt: string; payload: string } {
  const salt = crypto.randomBytes(16);
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8");
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return {
    salt: salt.toString("hex"),
    payload: iv.toString("hex") + ":" + encrypted.toString("hex"),
  };
}

export function decryptWithPassword(encrypted: string, password: string, saltHex: string): string {
  const salt = Buffer.from(saltHex, "hex");
  const key = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, "sha256");
  const textParts = encrypted.split(":");
  const ivStr = textParts.shift();
  const encryptedStr = textParts.join(":");
  if (!ivStr || !encryptedStr) throw new Error("Invalid encrypted data");
  const iv = Buffer.from(ivStr, "hex");
  const encryptedText = Buffer.from(encryptedStr, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
