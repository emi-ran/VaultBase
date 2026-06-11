import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import { execSync } from "child_process";

// Set test environment variables
process.env.DATABASE_URL = "file:./test-db.db";
process.env.APP_SECRET = "test-secret-key-1234567890";

// Ensure tables exist in the test db
console.log("Initializing test database...");
execSync("npx prisma db push --accept-data-loss", { 
  env: { ...process.env, DATABASE_URL: "file:./test-db.db" } 
});

// Import Prisma client and actions AFTER setting database env
import { prisma } from "../lib/db.ts";
import { encrypt, decrypt } from "../lib/encryption.ts";
import { exportSettingsAction, importSettingsAction } from "../app/actions.ts";

test("Encryption & Decryption core tests", async (t) => {
  await t.test("should successfully encrypt and decrypt a string", () => {
    const original = "my-db-password-123";
    const encrypted = encrypt(original);
    assert.ok(encrypted.includes(":"), "Encrypted string should contain separator ':'");
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, original, "Decrypted string should match original text");
  });

  await t.test("should gracefully handle empty or invalid strings", () => {
    assert.strictEqual(decrypt(""), "");
    assert.strictEqual(decrypt("no-separator"), "");
    assert.strictEqual(decrypt("invalid_iv:ciphertext"), "");
  });

  await t.test("should handle mismatched keys gracefully", () => {
    const original = "highly-secure-password";
    const encrypted = encrypt(original);

    process.env.APP_SECRET = "different-secret-key-9999999999";
    const decrypted = decrypt(encrypted);
    assert.strictEqual(decrypted, "", "Decryption should return empty string when APP_SECRET mismatches");
    
    // Restore APP_SECRET
    process.env.APP_SECRET = "test-secret-key-1234567890";
  });
});

test("Settings Export / Import tests", async (t) => {
  // Clear any existing test database connections
  await prisma.databaseConnection.deleteMany();
  await prisma.schedule.deleteMany();

  // Insert a test database connection
  const dbPassword = "my-vault-pass";
  const encryptedPassword = encrypt(dbPassword);

  await prisma.databaseConnection.create({
    data: {
      name: "TestDB",
      host: "localhost",
      port: 5432,
      user: "postgres",
      database: "test",
      password: encryptedPassword,
      ssl: "prefer",
      environment: "production",
      labels: "test,auth",
      status: "healthy",
    }
  });

  await t.test("should export settings as an encrypted JSON structure", async () => {
    const res = await exportSettingsAction();
    assert.strictEqual(res.success, true);
    assert.ok(res.jsonString);

    const parsed = JSON.parse(res.jsonString);
    assert.strictEqual(parsed.encrypted, true, "Exported JSON should indicate it is encrypted");
    assert.ok(parsed.payload, "Exported JSON should contain encrypted payload");

    // Decrypt the payload manually to verify internal data
    const decryptedStr = decrypt(parsed.payload);
    assert.ok(decryptedStr);
    
    const decryptedData = JSON.parse(decryptedStr);
    assert.strictEqual(decryptedData.databases.length, 1);
    assert.strictEqual(decryptedData.databases[0].name, "TestDB");
    assert.strictEqual(decryptedData.databases[0].password, dbPassword, "Exported password should be decrypted to plain text inside the encrypted payload");
  });

  await t.test("should successfully import encrypted settings with matching APP_SECRET", async () => {
    // 1. Export settings while DB contains TestDB
    const exportRes = await exportSettingsAction();
    assert.strictEqual(exportRes.success, true);

    // 2. Clear database to test import
    await prisma.databaseConnection.deleteMany();

    // 3. Import settings back
    const importRes = await importSettingsAction(exportRes.jsonString!);
    console.log("SUCCESS TEST IMPORT RES:", importRes);
    assert.strictEqual(importRes.success, true);
    assert.strictEqual(importRes.importedCount, 1);

    // Verify imported database connection and correct password re-encryption
    const importedDbs = await prisma.databaseConnection.findMany();
    assert.strictEqual(importedDbs.length, 1);
    assert.strictEqual(importedDbs[0].name, "TestDB");
    
    const decryptedPassword = decrypt(importedDbs[0].password);
    assert.strictEqual(decryptedPassword, dbPassword, "Imported database password should be correctly decrypted");
  });

  await t.test("should fail to import settings with mismatched APP_SECRET", async () => {
    // 1. Export settings
    const exportRes = await exportSettingsAction();
    assert.strictEqual(exportRes.success, true);

    // 2. Change APP_SECRET on import
    process.env.APP_SECRET = "wrong-secret-key";
    
    // 3. Call import action directly (since decrypt uses process.env.APP_SECRET dynamically)
    const importRes = await importSettingsAction(exportRes.jsonString!);
    console.log("WRONG SECRET TEST IMPORT RES:", importRes);
    assert.strictEqual(importRes.success, false, "Import should fail due to decryption mismatch");
    assert.ok(importRes.error.includes("Decryption failed"), "Error message should mention Decryption failed");

    // Restore APP_SECRET
    process.env.APP_SECRET = "test-secret-key-1234567890";
  });
});

// Cleanup files after tests
test.after(async () => {
  console.log("Cleaning up test database files...");
  // Close database connections first if necessary (Prisma disconnects automatically or we can call $disconnect)
  await prisma.$disconnect();

  const filesToDelete = [
    "./test-db.db",
    "./test-db.db-journal",
    "./test-db.db-shm",
    "./test-db.db-wal"
  ];
  for (const file of filesToDelete) {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        // Safe ignore
      }
    }
  }
});
