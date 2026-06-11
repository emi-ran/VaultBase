"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import fs from "fs";
import path from "path";
import { prisma, DatabaseConnection, Schedule } from "../lib/db";
import { encrypt, decrypt } from "../lib/encryption";
import { testPostgresConnection, fetchPostgresTables, fetchTableData, fetchDatabaseSize, DBConfig } from "../lib/db-client";
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

// Test Connection Action
export async function testConnectionAction(formData: {
  mode: "url" | "fields";
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl?: string;
}) {
  try {
    let config: DBConfig = {};

    if (formData.mode === "url") {
      if (!formData.connectionString) {
        return { success: false, error: "Connection URL is required" };
      }
      const parsed = parsePostgresUrl(formData.connectionString);
      config = {
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: formData.ssl || parsed.ssl,
      };
    } else {
      config = {
        host: formData.host || "localhost",
        port: formData.port || 5432,
        user: formData.user || "",
        password: formData.password || "",
        database: formData.database || "",
        ssl: formData.ssl || "prefer",
      };
    }

    const testResult = await testPostgresConnection(config);
    return testResult;
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to test connection" };
  }
}

// Add Database Action
export async function addDatabaseAction(formData: {
  name: string;
  mode: "url" | "fields";
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
      const parsed = parsePostgresUrl(formData.connectionString);
      connInfo = {
        host: parsed.host,
        port: parsed.port,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        ssl: formData.ssl || parsed.ssl,
      };
    } else {
      connInfo = {
        host: formData.host || "localhost",
        port: Number(formData.port) || 5432,
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
      const test = await testPostgresConnection({
        ...connInfo,
      });
      status = test.success ? "healthy" : "offline";
    } catch {}

    const newDb = await prisma.databaseConnection.create({
      data: {
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
export async function triggerBackupAction(dbId: string) {
  try {
    const result = await runBackup(dbId, "manual");
    revalidatePath("/");
    return result;
  } catch (error: any) {
    return { success: false, error: error.message || "Backup failed" };
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
export async function exportSettingsAction() {
  try {
    const databases = await prisma.databaseConnection.findMany();
    const schedules = await prisma.schedule.findMany();

    const exportData = {
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      databases: databases.map((db: DatabaseConnection) => ({
        name: db.name,
        host: db.host,
        port: db.port,
        user: db.user,
        database: db.database,
        password: db.password, // Keep encrypted, decrypts correctly if keys match
        ssl: db.ssl,
        environment: db.environment,
        labels: db.labels,
      })),
      schedules: schedules.map((sch: Schedule) => {
        // Map to corresponding database short name to match on restore
        const db = databases.find((d: DatabaseConnection) => d.id === sch.databaseId);
        return {
          dbName: db ? db.name : null,
          cron: sch.cron,
          enabled: sch.enabled,
        };
      }),
    };

    return { success: true, jsonString: JSON.stringify(exportData, null, 2) };
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to export settings" };
  }
}

// Import Settings Action
export async function importSettingsAction(jsonString: string) {
  try {
    const importData = JSON.parse(jsonString);
    if (!importData.databases || !Array.isArray(importData.databases)) {
      throw new Error("Invalid import format: missing databases array");
    }

    let importedCount = 0;

    for (const dbInfo of importData.databases) {
      // Find if duplicate exists by matching short name and host/db
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

      if (existing) {
        // Update credentials and info
        const updated = await prisma.databaseConnection.update({
          where: { id: existing.id },
          data: {
            host: dbInfo.host,
            port: dbInfo.port,
            user: dbInfo.user,
            password: dbInfo.password, // Keep encrypted string (assuming matching secrets)
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
            name: dbInfo.name,
            host: dbInfo.host,
            port: dbInfo.port,
            user: dbInfo.user,
            database: dbInfo.database,
            password: dbInfo.password,
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
