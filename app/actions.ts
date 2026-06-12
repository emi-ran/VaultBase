"use server";

import { revalidatePath as nextRevalidatePath } from "next/cache";

function revalidatePath(path: string) {
  try {
    nextRevalidatePath(path);
  } catch (error) {
    // Ignore error when run outside Next.js request context (e.g. in test scripts or background cron workers)
  }
}
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { prisma, DatabaseConnection, Schedule } from "../lib/db";
import { encrypt, decrypt, encryptWithPassword, decryptWithPassword } from "../lib/encryption";
import { testPostgresConnection, fetchPostgresTables, fetchTableData, fetchDatabaseSize, DBConfig } from "../lib/db-client";
import { testMongoConnection } from "../lib/db-mongo-client";
import { runBackup, getBackupDirectory } from "../lib/backup-service";
import { Locale } from "../lib/i18n";

// Parse PostgreSQL URL into connection fields
function parsePostgresUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
      throw new Error("Invalid protocol. Must be postgresql:// or postgres://");
    }
    return {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : 5432,
      user: decodeURIComponent(url.username) || "",
      password: decodeURIComponent(url.password) || "",
      database: decodeURIComponent(url.pathname.substring(1)) || "",
      ssl: url.searchParams.get("sslmode") === "disable" ? "disable" : "prefer",
    };
  } catch (error: any) {
    throw new Error(`Invalid PostgreSQL URL: ${error.message}`);
  }
}

// Parse MongoDB URL into connection fields
function parseMongoUrl(urlStr: string) {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== "mongodb:" && url.protocol !== "mongodb+srv:") {
      throw new Error("Invalid protocol. Must be mongodb:// or mongodb+srv://");
    }
    const ssl = url.protocol === "mongodb+srv:" ? "require" : url.searchParams.get("ssl") === "disable" ? "disable" : "prefer";
    return {
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port, 10) : (url.protocol === "mongodb+srv:" ? 27017 : 27017),
      user: decodeURIComponent(url.username) || "",
      password: decodeURIComponent(url.password) || "",
      database: decodeURIComponent(url.pathname.substring(1)) || "",
      ssl,
    };
  } catch (error: any) {
    throw new Error(`Invalid MongoDB URL: ${error.message}`);
  }
}

// Locale switcher action
export async function setLanguageAction(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 31536000,
    sameSite: "lax",
  });
  return { success: true };
}

// Login Action
export async function loginAction(username: string, password: string) {
  try {
    const { verifyCredentials, createSession } = await import("../lib/auth");
    if (!verifyCredentials(username, password)) {
      return { success: false, error: "INVALID_CREDENTIALS" };
    }
    const token = await createSession(username);
    const cookieStore = await cookies();
    cookieStore.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 86400,
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Login failed" };
  }
}

// Logout Action
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.set("session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return { success: true };
}

// Test Connection Action
export async function testConnectionAction(formData: {
  mode: "url" | "fields";
  type?: "postgresql" | "mongodb";
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: string;
  dbId?: string;
}) {
  try {
    let dbType = formData.type || "postgresql";
    let config: DBConfig = {};

    if (formData.mode === "url") {
      if (!formData.connectionString) {
        return { success: false, error: "Connection URL is required" };
      }
      if (formData.connectionString.startsWith("mongodb")) {
        dbType = "mongodb";
        const parsed = parseMongoUrl(formData.connectionString);
        config = {
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: formData.ssl || parsed.ssl,
        };
      } else {
        const parsed = parsePostgresUrl(formData.connectionString);
        config = {
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: formData.ssl || parsed.ssl,
        };
      }
    } else {
      let password = formData.password || "";
      if (!password && formData.dbId) {
        const db = await prisma.databaseConnection.findUnique({ where: { id: formData.dbId } });
        if (db) {
          password = decrypt(db.password);
        }
      }
      config = {
        host: formData.host || "localhost",
        port: formData.port || (dbType === "mongodb" ? 27017 : 5432),
        user: formData.user || "",
        password,
        database: formData.database || "",
        ssl: formData.ssl || "prefer",
      };
    }

    if (dbType === "mongodb") {
      return await testMongoConnection(config);
    }
    return await testPostgresConnection(config);
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to test connection" };
  }
}

// Add Database Action
export async function addDatabaseAction(formData: {
  name: string;
  mode: "url" | "fields";
  type?: "postgresql" | "mongodb";
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: string;
  environment?: string;
  labels?: string;
}) {
  try {
    let dbType = formData.type || "postgresql";
    let connInfo = {
      host: "localhost",
      port: 5432,
      user: "",
      password: "",
      database: "",
      ssl: "prefer",
    };

    if (formData.mode === "url") {
      if (!formData.connectionString) {
        throw new Error("Connection URL is required");
      }
      if (formData.connectionString.startsWith("mongodb")) {
        dbType = "mongodb";
        const parsed = parseMongoUrl(formData.connectionString);
        connInfo = {
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: formData.ssl || parsed.ssl,
        };
      } else {
        const parsed = parsePostgresUrl(formData.connectionString);
        connInfo = {
          host: parsed.host,
          port: parsed.port,
          user: parsed.user,
          password: parsed.password,
          database: parsed.database,
          ssl: formData.ssl || parsed.ssl,
        };
      }
    } else {
      connInfo = {
        host: formData.host || "localhost",
        port: Number(formData.port) || (dbType === "mongodb" ? 27017 : 5432),
        user: formData.user || "",
        password: formData.password || "",
        database: formData.database || "",
        ssl: formData.ssl || "prefer",
      };
    }

    const encryptedPassword = encrypt(connInfo.password);

    // Test connection before saving (non-blocking, but sets initial health)
    let status = "untested";
    try {
      const test = dbType === "mongodb"
        ? await testMongoConnection({ ...connInfo })
        : await testPostgresConnection({ ...connInfo });
      status = test.success ? "healthy" : "offline";
    } catch {}

    const newDb = await prisma.databaseConnection.create({
      data: {
        type: dbType,
        name: formData.name,
        host: connInfo.host,
        port: connInfo.port,
        user: connInfo.user,
        database: connInfo.database,
        password: encryptedPassword,
        ssl: connInfo.ssl,
        environment: formData.environment || "production",
        labels: formData.labels || "",
        status,
        lastTestedAt: new Date(),
      },
    });

    revalidatePath("/");
    return { success: true, database: newDb };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save database" };
  }
}

// Delete Database Action
export async function deleteDatabaseAction(id: string) {
  try {
    await prisma.databaseConnection.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete database" };
  }
}

// Trigger Manual Backup Action
export async function triggerBackupAction(dbId: string, customFilename?: string) {
  try {
    const result = await runBackup(dbId, "manual", customFilename);
    revalidatePath("/");
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Backup failed" };
  }
}

// Restore from Archive Action
export async function restoreFromArchiveAction(backupId: string, targetDatabaseId: string) {
  try {
    const backup = await prisma.backupJob.findUnique({ where: { id: backupId } })
    if (!backup) return { success: false, error: "Backup record not found" }

    if (!fs.existsSync(backup.filepath)) {
      return { success: false, error: "Backup file not found on disk" }
    }

    const db = await prisma.databaseConnection.findUnique({ where: { id: targetDatabaseId } })
    if (!db) return { success: false, error: "Target database not found" }

    const decrypt = (await import("../lib/encryption")).decrypt
    const decryptedPassword = decrypt(db.password)

    // Create a processing log entry
    const restoreLog = await prisma.backupJob.create({
      data: {
        databaseId: db.id,
        filename: `restore_${backup.filename}`,
        filepath: backup.filepath,
        sizeBytes: 0,
        status: "processing",
        triggerType: "manual",
        type: "restore",
      },
    })

    const fileStream = fs.createReadStream(backup.filepath)

    let result: { success: boolean; error?: string }

    if (db.type === "mongodb") {
      const { runMongoRestore } = await import("../lib/restore-mongo-service")
      result = await runMongoRestore(fileStream, {
        host: db.host,
        port: db.port,
        user: db.user,
        password: decryptedPassword,
        database: db.database,
        ssl: db.ssl,
      }, backup.filepath)
    } else {
      const { runRestore } = await import("../lib/restore-service")
      result = await runRestore(fileStream, {
        host: db.host,
        port: db.port,
        user: db.user,
        password: decryptedPassword,
        database: db.database,
      })
    }

    if (result.success) {
      try {
        const stats = fs.statSync(backup.filepath)
        await prisma.backupJob.update({
          where: { id: restoreLog.id },
          data: { status: "success", sizeBytes: stats.size },
        })
      } catch {
        await prisma.backupJob.update({
          where: { id: restoreLog.id },
          data: { status: "success" },
        })
      }
      revalidatePath("/")
      return { success: true }
    } else {
      await prisma.backupJob.update({
        where: { id: restoreLog.id },
        data: { status: "failed", errorMessage: result.error },
      })
      revalidatePath("/")
      return { success: false, error: result.error }
    }
  } catch (error: any) {
    return { success: false, error: error.message || "Restore failed" }
  }
}

// Delete Backup Archive Action
export async function deleteBackupAction(id: string) {
  try {
    const job = await prisma.backupJob.findUnique({ where: { id } });
    if (job) {
      // Delete file if exists
      if (fs.existsSync(job.filepath)) {
        fs.unlinkSync(job.filepath);
      }
      // Delete database record
      await prisma.backupJob.delete({ where: { id } });
    }
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete backup" };
  }
}

// Clear Completed Backups (Delete all records and files)
export async function clearAllBackupsAction() {
  try {
    const jobs = await prisma.backupJob.findMany();
    for (const job of jobs) {
      if (fs.existsSync(job.filepath)) {
        fs.unlinkSync(job.filepath);
      }
    }
    await prisma.backupJob.deleteMany();
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to clear backup archive" };
  }
}

// Get Database Tables Action (Read-only view)
export async function getDatabaseTablesAction(id: string) {
  try {
    const db = await prisma.databaseConnection.findUnique({ where: { id } });
    if (!db) throw new Error("Database config not found");

    const decryptedPassword = decrypt(db.password);
    const tables = await fetchPostgresTables({
      host: db.host,
      port: db.port,
      user: db.user,
      password: decryptedPassword,
      database: db.database,
      ssl: db.ssl,
    });

    return { success: true, tables };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch tables" };
  }
}

// Get Table Data Action (Read-only view)
export async function getTableDataAction(id: string, tableName: string, page: number = 1, pageSize: number = 25) {
  try {
    const db = await prisma.databaseConnection.findUnique({ where: { id } });
    if (!db) throw new Error("Database config not found");

    const decryptedPassword = decrypt(db.password);
    const data = await fetchTableData(
      {
        host: db.host,
        port: db.port,
        user: db.user,
        password: decryptedPassword,
        database: db.database,
        ssl: db.ssl,
      },
      tableName,
      page,
      pageSize
    );

    return { success: true, ...data };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch table data" };
  }
}

// Export Settings Action
export async function exportSettingsAction(password?: string) {
  try {
    const databases = await prisma.databaseConnection.findMany();
    const schedules = await prisma.schedule.findMany();

    const settingsRecords = await prisma.setting.findMany();

    const exportData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      databases: databases.map((db: DatabaseConnection) => ({
        type: db.type || "postgresql",
        name: db.name,
        host: db.host,
        port: db.port,
        user: db.user,
        database: db.database,
        password: decrypt(db.password),
        ssl: db.ssl,
        environment: db.environment,
        labels: db.labels,
      })),
      schedules: schedules.map((sch: Schedule) => {
        const db = databases.find((d: DatabaseConnection) => d.id === sch.databaseId);
        return {
          dbName: db ? db.name : null,
          cron: sch.cron,
          enabled: sch.enabled,
        };
      }),
      settings: settingsRecords.map((s: { key: string; value: string }) => ({
        key: s.key,
        value: s.value,
      })),
    };

    let wrappedExport: any;

    if (password) {
      const jsonStr = JSON.stringify(exportData);
      const { salt, payload } = encryptWithPassword(jsonStr, password);
      wrappedExport = {
        version: "1.0.0",
        encrypted: true,
        passwordProtected: true,
        salt,
        payload,
      };
    } else {
      wrappedExport = {
        version: "1.0.0",
        encrypted: false,
        data: exportData,
      };
    }

    return { success: true, jsonString: JSON.stringify(wrappedExport, null, 2) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to export settings" };
  }
}

// Import Settings Action
export async function importSettingsAction(jsonString: string, password?: string) {
  try {
    const parsedData = JSON.parse(jsonString);
    let importData: any;

    if (parsedData && parsedData.passwordProtected) {
      if (!password) {
        return { success: false, error: "PASSWORD_REQUIRED" };
      }
      try {
        const decryptedStr = decryptWithPassword(parsedData.payload, password, parsedData.salt);
        importData = JSON.parse(decryptedStr);
      } catch {
        return { success: false, error: "WRONG_PASSWORD" };
      }
    } else if (parsedData && parsedData.encrypted && !parsedData.passwordProtected && parsedData.payload) {
      const decryptedStr = decrypt(parsedData.payload);
      if (!decryptedStr) {
        throw new Error("Decryption failed. Please make sure the APP_SECRET on this server matches the exporting server.");
      }
      importData = JSON.parse(decryptedStr);
    } else if (!parsedData.encrypted && parsedData.data) {
      importData = parsedData.data;
    } else {
      throw new Error("Invalid import format");
    }

    if (!importData.databases || !Array.isArray(importData.databases)) {
      throw new Error("Invalid import format: missing databases array");
    }

    let importedCount = 0;

    for (const dbInfo of importData.databases) {
      const existing = await prisma.databaseConnection.findFirst({
        where: {
          OR: [
            { name: dbInfo.name },
            {
              host: dbInfo.host,
              port: dbInfo.port,
              database: dbInfo.database,
            }
          ]
        }
      });

      let dbId = "";

      const dbPassword = encrypt(dbInfo.password || "");

      const dbType = dbInfo.type || "postgresql";

      if (existing) {
        // Update credentials and info
        const updated = await prisma.databaseConnection.update({
          where: { id: existing.id },
          data: {
            type: dbType,
            host: dbInfo.host,
            port: dbInfo.port,
            user: dbInfo.user,
            password: dbPassword,
            ssl: dbInfo.ssl,
            environment: dbInfo.environment,
            labels: dbInfo.labels,
          }
        });
        dbId = updated.id;
      } else {
        // Create new
        const created = await prisma.databaseConnection.create({
          data: {
            type: dbType,
            name: dbInfo.name,
            host: dbInfo.host,
            port: dbInfo.port,
            user: dbInfo.user,
            database: dbInfo.database,
            password: dbPassword,
            ssl: dbInfo.ssl,
            environment: dbInfo.environment,
            labels: dbInfo.labels,
            status: "untested",
          }
        });
        dbId = created.id;
        importedCount++;
      }

      // Check for associated schedules in the backup package
      if (importData.schedules && Array.isArray(importData.schedules)) {
        const matchingSchedules = importData.schedules.filter((sch: any) => sch.dbName === dbInfo.name);
        for (const schInfo of matchingSchedules) {
          const existingSchedule = await prisma.schedule.findFirst({
            where: {
              databaseId: dbId,
              cron: schInfo.cron,
            }
          });

          if (!existingSchedule) {
            await prisma.schedule.create({
              data: {
                databaseId: dbId,
                cron: schInfo.cron,
                enabled: schInfo.enabled ?? true,
              }
            });
          }
        }
      }
    }

    // Import settings (timezone, healthCheckInterval, etc.)
    if (importData.settings && Array.isArray(importData.settings)) {
      for (const setting of importData.settings) {
        await prisma.setting.upsert({
          where: { key: setting.key },
          update: { value: setting.value },
          create: { key: setting.key, value: setting.value },
        });
      }
    }

    // Reload cron schedules in case timezone changed
    const { reloadSchedules } = await import("../lib/cron-service");
    await reloadSchedules();

    revalidatePath("/");
    return { success: true, importedCount };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to import settings" };
  }
}

// Get Database Size Action
export async function getDatabaseSizeAction(id: string) {
  try {
    const db = await prisma.databaseConnection.findUnique({ where: { id } });
    if (!db) throw new Error("Database config not found");

    const decryptedPassword = decrypt(db.password);

    if (db.type === "mongodb") {
      const { fetchMongoDatabaseSize } = await import("../lib/db-mongo-client");
      const size = await fetchMongoDatabaseSize({
        host: db.host,
        port: db.port,
        user: db.user,
        password: decryptedPassword,
        database: db.database,
        ssl: db.ssl,
      });
      return { success: true, size };
    }

    const size = await fetchDatabaseSize({
      host: db.host,
      port: db.port,
      user: db.user,
      password: decryptedPassword,
      database: db.database,
      ssl: db.ssl,
    });

    return { success: true, size };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to fetch database size" };
  }
}

// Update Database Action
export async function updateDatabaseAction(id: string, formData: {
  name: string;
  mode: "url" | "fields";
  type?: "postgresql" | "mongodb";
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: string;
  environment?: string;
  labels?: string;
}) {
  try {
    const db = await prisma.databaseConnection.findUnique({ where: { id } });
    if (!db) throw new Error("Database config not found");

    let dbType = formData.type || db.type;
    let connInfo = {
      host: db.host,
      port: db.port,
      user: db.user,
      password: decrypt(db.password),
      database: db.database,
      ssl: db.ssl,
    };

    if (formData.mode === "url") {
      if (formData.connectionString) {
        if (formData.connectionString.startsWith("mongodb")) {
          dbType = "mongodb";
          const parsed = parseMongoUrl(formData.connectionString);
          connInfo = {
            host: parsed.host,
            port: parsed.port,
            user: parsed.user,
            password: parsed.password || connInfo.password,
            database: parsed.database,
            ssl: formData.ssl || parsed.ssl,
          };
        } else {
          const parsed = parsePostgresUrl(formData.connectionString);
          connInfo = {
            host: parsed.host,
            port: parsed.port,
            user: parsed.user,
            password: parsed.password || connInfo.password,
            database: parsed.database,
            ssl: formData.ssl || parsed.ssl,
          };
        }
      }
    } else {
      connInfo = {
        host: formData.host || db.host,
        port: formData.port ? Number(formData.port) : db.port,
        user: formData.user || db.user,
        password: formData.password || connInfo.password,
        database: formData.database || db.database,
        ssl: formData.ssl || db.ssl,
      };
    }

    const encryptedPassword = encrypt(connInfo.password);

    // Test connection after saving
    let status = db.status;
    try {
      const test = dbType === "mongodb"
        ? await testMongoConnection({ ...connInfo })
        : await testPostgresConnection({ ...connInfo });
      status = test.success ? "healthy" : "offline";
    } catch {}

    const updatedDb = await prisma.databaseConnection.update({
      where: { id },
      data: {
        type: dbType,
        name: formData.name,
        host: connInfo.host,
        port: connInfo.port,
        user: connInfo.user,
        database: connInfo.database,
        password: encryptedPassword,
        ssl: connInfo.ssl,
        environment: formData.environment || db.environment,
        labels: formData.labels || db.labels,
        status,
        lastTestedAt: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/databases");
    return { success: true, database: updatedDb };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update database" };
  }
}

// Test Connection & Update Status Action
export async function testAndUpdateDatabaseStatusAction(id: string) {
  try {
    const db = await prisma.databaseConnection.findUnique({ where: { id } });
    if (!db) throw new Error("Database config not found");

    const decryptedPassword = decrypt(db.password);
    
    let status = "offline";
    try {
      const testResult = db.type === "mongodb"
        ? await testMongoConnection({
            host: db.host,
            port: db.port,
            user: db.user,
            password: decryptedPassword,
            database: db.database,
            ssl: db.ssl,
          })
        : await testPostgresConnection({
            host: db.host,
            port: db.port,
            user: db.user,
            password: decryptedPassword,
            database: db.database,
            ssl: db.ssl,
          });
      status = testResult.success ? "healthy" : "offline";
    } catch {}

    const updatedDb = await prisma.databaseConnection.update({
      where: { id },
      data: {
        status,
        lastTestedAt: new Date(),
      },
    });

    revalidatePath("/");
    revalidatePath("/databases");
    return { success: true, status, lastTestedAt: updatedDb.lastTestedAt };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to test and update status" };
  }
}

// Get Settings Action
export async function getSettingsAction() {
  try {
    const [timezoneSetting, healthCheckIntervalSetting] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "timezone" } }),
      prisma.setting.findUnique({ where: { key: "healthCheckInterval" } }),
    ]);
    return {
      success: true,
      timezone: timezoneSetting?.value || "Europe/Istanbul",
      healthCheckInterval: healthCheckIntervalSetting?.value || "30",
    };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to load settings" };
  }
}

// Save Settings Action
export async function saveSettingsAction(timezone: string, healthCheckInterval?: string) {
  try {
    await prisma.setting.upsert({
      where: { key: "timezone" },
      update: { value: timezone },
      create: { key: "timezone", value: timezone },
    });

    if (healthCheckInterval !== undefined) {
      await prisma.setting.upsert({
        where: { key: "healthCheckInterval" },
        update: { value: healthCheckInterval },
        create: { key: "healthCheckInterval", value: healthCheckInterval },
      });
    }
    
    // Dynamically import reloadSchedules to prevent circular dependency
    const { reloadSchedules } = await import("../lib/cron-service");
    await reloadSchedules();
    
    revalidatePath("/");
    revalidatePath("/settings");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to save settings" };
  }
}

// Test All Connections Action
export async function testAllConnectionsAction() {
  try {
    const databases = await prisma.databaseConnection.findMany();
    const results: { id: string; name: string; status: string; error?: string }[] = [];

    await Promise.all(
      databases.map(async (db: DatabaseConnection) => {
        try {
          const decryptedPassword = decrypt(db.password);
          const testResult = db.type === "mongodb"
            ? await testMongoConnection({
                host: db.host,
                port: db.port,
                user: db.user,
                password: decryptedPassword,
                database: db.database,
                ssl: db.ssl,
              })
            : await testPostgresConnection({
                host: db.host,
                port: db.port,
                user: db.user,
                password: decryptedPassword,
                database: db.database,
                ssl: db.ssl,
              });

          const status = testResult.success ? "healthy" : "offline";

          await prisma.databaseConnection.update({
            where: { id: db.id },
            data: { status, lastTestedAt: new Date() },
          });

          results.push({ id: db.id, name: db.name, status, error: testResult.error });
        } catch (err: any) {
          results.push({ id: db.id, name: db.name, status: "offline", error: err.message });
        }
      })
    );

    return { success: true, results };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to test all connections" };
  }
}

// Add Schedule Action
export async function addScheduleAction(databaseId: string, cron: string, enabled: boolean = true) {
  try {
    const newSchedule = await prisma.schedule.create({
      data: {
        databaseId,
        cron,
        enabled,
      },
    });

    const { reloadSchedules } = await import("../lib/cron-service");
    await reloadSchedules();

    revalidatePath("/");
    revalidatePath("/schedules");
    return { success: true, schedule: newSchedule };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to create schedule" };
  }
}

// Update Schedule Action
export async function updateScheduleAction(id: string, cron: string, enabled: boolean) {
  try {
    const updated = await prisma.schedule.update({
      where: { id },
      data: {
        cron,
        enabled,
      },
    });

    const { reloadSchedules } = await import("../lib/cron-service");
    await reloadSchedules();

    revalidatePath("/");
    revalidatePath("/schedules");
    return { success: true, schedule: updated };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to update schedule" };
  }
}

// Delete Schedule Action
export async function deleteScheduleAction(id: string) {
  try {
    await prisma.schedule.delete({
      where: { id },
    });

    const { reloadSchedules } = await import("../lib/cron-service");
    await reloadSchedules();

    revalidatePath("/");
    revalidatePath("/schedules");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to delete schedule" };
  }
}
