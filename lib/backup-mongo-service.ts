import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { decrypt } from "./encryption";
import { testMongoConnection } from "./db-mongo-client";
import { getBackupDirectory } from "./backup-service";

export interface MongoBackupResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  sizeBytes?: number;
  error?: string;
}

export async function runMongoBackup(
  dbId: string,
  triggerType: "manual" | "scheduled",
  customFilename?: string
): Promise<MongoBackupResult> {
  const { prisma } = await import("./db");

  const dbConfig = await prisma.databaseConnection.findUnique({
    where: { id: dbId },
  });

  if (!dbConfig) {
    return { success: false, error: "Database connection not found" };
  }

  const decryptedPassword = decrypt(dbConfig.password);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  let filename = `${dbConfig.name}_mongo_backup_${timestamp}.gz`;

  if (customFilename && customFilename.trim()) {
    let cleanName = customFilename.replace(/[^a-zA-Z0-9_\-]/g, "_").trim();
    if (cleanName) {
      if (!cleanName.endsWith(".gz")) {
        cleanName = cleanName + ".gz";
      }
      filename = cleanName;
    }
  }

  const filepath = path.join(getBackupDirectory(), filename);

  const job = await prisma.backupJob.create({
    data: {
      databaseId: dbConfig.id,
      filename,
      filepath,
      sizeBytes: 0,
      status: "processing",
      triggerType,
    },
  });

  return new Promise((resolve) => {
    try {
      const writeStream = fs.createWriteStream(filepath);
      const gzip = zlib.createGzip();
      gzip.pipe(writeStream);

      const sslParam = dbConfig.ssl !== "disable" ? "&ssl=true&tlsAllowInvalidCertificates=true" : "&ssl=false";
      const uri = `mongodb://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(decryptedPassword)}@${dbConfig.host}:${dbConfig.port}/${encodeURIComponent(dbConfig.database)}?authSource=admin${sslParam}`;

      console.log(`Starting mongodump for ${dbConfig.name}. Output: ${filepath}`);

      let hasErrorOccurred = false;

      const mongodump = spawn("mongodump", [
        `--uri=${uri}`,
        "--archive",
      ]);

      mongodump.stdout.pipe(gzip);

      let stderrData = "";
      mongodump.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      mongodump.on("error", async (err: any) => {
        hasErrorOccurred = true;
        console.error("mongodump process error:", err);
        gzip.end();
        writeStream.end();
        cleanupFailedBackup(filepath);

        let errorMessage = err.message || "Process failed";
        if (err.code === "ENOENT") {
          errorMessage = "mongodump executable was not found on the system path.";
        }

        await prisma.backupJob.update({
          where: { id: job.id },
          data: { status: "failed", errorMessage },
        });

        let dbStatus = "healthy";
        try {
          const test = await testMongoConnection({
            host: dbConfig.host,
            port: dbConfig.port,
            user: dbConfig.user,
            password: decryptedPassword,
            database: dbConfig.database,
            ssl: dbConfig.ssl,
          });
          dbStatus = test.success ? "healthy" : "offline";
        } catch {
          dbStatus = "offline";
        }

        await prisma.databaseConnection.update({
          where: { id: dbConfig.id },
          data: { status: dbStatus, lastTestedAt: new Date() },
        });

        resolve({ success: false, error: errorMessage });
      });

      mongodump.on("close", async (code) => {
        if (hasErrorOccurred) return;
        if (code === 0) {
          writeStream.on("finish", async () => {
            try {
              const stats = fs.statSync(filepath);
              const sizeBytes = stats.size;

              await prisma.backupJob.update({
                where: { id: job.id },
                data: { status: "success", sizeBytes },
              });

              await prisma.databaseConnection.update({
                where: { id: dbConfig.id },
                data: { status: "healthy", lastTestedAt: new Date() },
              });

              resolve({ success: true, filename, filepath, sizeBytes });
            } catch (err: any) {
              cleanupFailedBackup(filepath);
              await prisma.backupJob.update({
                where: { id: job.id },
                data: { status: "failed", errorMessage: `Failed to calculate file size: ${err.message}` },
              });
              resolve({ success: false, error: err.message });
            }
          });
        } else {
          cleanupFailedBackup(filepath);
          console.error(`mongodump failed with exit code ${code}: ${stderrData}`);
          await prisma.backupJob.update({
            where: { id: job.id },
            data: { status: "failed", errorMessage: stderrData || `Exit code ${code}` },
          });

          let dbStatus = "healthy";
          try {
            const test = await testMongoConnection({
              host: dbConfig.host,
              port: dbConfig.port,
              user: dbConfig.user,
              password: decryptedPassword,
              database: dbConfig.database,
              ssl: dbConfig.ssl,
            });
            dbStatus = test.success ? "healthy" : "offline";
          } catch {
            dbStatus = "offline";
          }

          await prisma.databaseConnection.update({
            where: { id: dbConfig.id },
            data: { status: dbStatus, lastTestedAt: new Date() },
          });

          resolve({ success: false, error: stderrData || `Exit code ${code}` });
        }
      });
    } catch (error: any) {
      cleanupFailedBackup(filepath);
      console.error("Mongo backup service runtime error:", error);
      prisma.backupJob.update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: error.message || "Runtime error" },
      }).catch(console.error);
      resolve({ success: false, error: error.message });
    }
  });
}

function cleanupFailedBackup(filepath: string) {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (err) {
    console.error("Failed to delete temp backup file:", err);
  }
}
