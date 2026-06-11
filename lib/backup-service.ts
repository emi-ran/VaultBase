import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { prisma } from "./db";
import { decrypt } from "./encryption";

const BACKUP_DIR = path.join(process.cwd(), "backups");

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export function getBackupDirectory() {
  return BACKUP_DIR;
}

export interface BackupResult {
  success: boolean;
  filename?: string;
  filepath?: string;
  sizeBytes?: number;
  error?: string;
}

export async function runBackup(dbId: string, triggerType: "manual" | "scheduled"): Promise<BackupResult> {
  // 1. Fetch database configuration
  const dbConfig = await prisma.databaseConnection.findUnique({
    where: { id: dbId },
  });

  if (!dbConfig) {
    return { success: false, error: "Database connection not found" };
  }

  const decryptedPassword = decrypt(dbConfig.password);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${dbConfig.name}_backup_${timestamp}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);

  // Create a record in processing state
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

      let pgDumpArgs: string[] = [];
      let env = { ...process.env };

      // We use connection string if possible, or construct from fields
      // Using PGPASSWORD env variable is the safest way to pass password to pg_dump
      env.PGPASSWORD = decryptedPassword;

      pgDumpArgs.push("-h", dbConfig.host);
      pgDumpArgs.push("-p", dbConfig.port.toString());
      pgDumpArgs.push("-U", dbConfig.user);
      pgDumpArgs.push("-d", dbConfig.database);
      pgDumpArgs.push("--clean"); // Include DROP TABLE statements
      pgDumpArgs.push("--no-owner"); // Do not output commands to set ownership
      pgDumpArgs.push("--no-privileges"); // Do not output commands to set privileges

      console.log(`Starting pg_dump for ${dbConfig.name}. Output: ${filepath}`);

      let hasErrorOccurred = false;

      const pgDump = spawn("pg_dump", pgDumpArgs, { env });

      pgDump.stdout.pipe(gzip);

      let stderrData = "";
      pgDump.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      pgDump.on("error", async (err: any) => {
        hasErrorOccurred = true;
        console.error("pg_dump process error:", err);
        gzip.end();
        writeStream.end();
        cleanupFailedBackup(filepath);

        let errorMessage = err.message || "Process failed";
        if (err.code === "ENOENT") {
          errorMessage = "pg_dump executable was not found on the system path.";
        }

        await prisma.backupJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            errorMessage,
          },
        });

        // Mark DB as offline since the backup process encountered a system failure
        await prisma.databaseConnection.update({
          where: { id: dbConfig.id },
          data: { status: "offline", lastTestedAt: new Date() },
        });

        resolve({ success: false, error: errorMessage });
      });

      pgDump.on("close", async (code) => {
        if (hasErrorOccurred) return;
        if (code === 0) {
          // Success
          writeStream.on("finish", async () => {
            try {
              const stats = fs.statSync(filepath);
              const sizeBytes = stats.size;

              await prisma.backupJob.update({
                where: { id: job.id },
                data: {
                  status: "success",
                  sizeBytes,
                },
              });

              // Mark database status as healthy
              await prisma.databaseConnection.update({
                where: { id: dbConfig.id },
                data: { status: "healthy", lastTestedAt: new Date() },
              });

              resolve({ success: true, filename, filepath, sizeBytes });
            } catch (err: any) {
              cleanupFailedBackup(filepath);
              await prisma.backupJob.update({
                where: { id: job.id },
                data: {
                  status: "failed",
                  errorMessage: `Failed to calculate file size: ${err.message}`,
                },
              });
              resolve({ success: false, error: err.message });
            }
          });
        } else {
          // pg_dump exited with error code
          cleanupFailedBackup(filepath);
          console.error(`pg_dump failed with exit code ${code}: ${stderrData}`);
          await prisma.backupJob.update({
            where: { id: job.id },
            data: {
              status: "failed",
              errorMessage: stderrData || `Exit code ${code}`,
            },
          });
          resolve({ success: false, error: stderrData || `Exit code ${code}` });
        }
      });
    } catch (error: any) {
      cleanupFailedBackup(filepath);
      console.error("Backup service runtime error:", error);
      prisma.backupJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          errorMessage: error.message || "Runtime error",
        },
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
