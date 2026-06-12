import { spawn } from "child_process";
import zlib from "zlib";
import fs from "fs";

export interface MongoRestoreConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  ssl?: string;
}

export async function runMongoRestore(
  readStream: NodeJS.ReadableStream,
  dbConfig: MongoRestoreConfig,
  filepath?: string
): Promise<{ success: boolean; error?: string }> {
  const sslParam = dbConfig.ssl !== "disable" ? "&ssl=true&tlsAllowInvalidCertificates=true" : "&ssl=false";
  const uri = `mongodb://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${encodeURIComponent(dbConfig.database)}?authSource=admin${sslParam}`;

  // File-backed restore: use mongorestore --archive=<file> --gzip --drop directly
  if (filepath && fs.existsSync(filepath)) {
    return runFileRestore(uri, filepath);
  }

  // Streaming restore: gunzip pipe into mongorestore --archive (stdin)
  return runStreamRestore(uri, readStream);
}

async function runFileRestore(uri: string, filepath: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let hasErrorOccurred = false;
    let stderrData = "";

    const restore = spawn("mongorestore", [
      `--uri=${uri}`,
      `--archive=${filepath}`,
      "--gzip",
      "--drop",
    ]);

    restore.stderr.on("data", (data) => { stderrData += data.toString(); });

    restore.on("error", (err) => {
      hasErrorOccurred = true;
      resolve({ success: false, error: err.message || "mongorestore process failed" });
    });

    restore.on("close", (code) => {
      if (hasErrorOccurred) return;
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderrData || `mongorestore exited with code ${code}` });
      }
    });
  });
}

async function runStreamRestore(uri: string, readStream: NodeJS.ReadableStream): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    let hasErrorOccurred = false;
    let stderrData = "";

    const restore = spawn("mongorestore", [
      `--uri=${uri}`,
      "--archive",
      "--drop",
    ]);

    restore.stderr.on("data", (data) => { stderrData += data.toString(); });

    const gunzip = zlib.createGunzip();
    gunzip.on("error", (err) => {
      hasErrorOccurred = true;
      restore.kill();
      resolve({ success: false, error: `Decompression failed: ${err.message}` });
    });

    readStream.on("error", (err) => {
      hasErrorOccurred = true;
      gunzip.destroy();
      restore.kill();
      resolve({ success: false, error: err.message || "Read stream failed" });
    });

    restore.on("error", (err) => {
      hasErrorOccurred = true;
      gunzip.destroy();
      resolve({ success: false, error: err.message || "mongorestore process failed" });
    });

    restore.on("close", (code) => {
      if (hasErrorOccurred) return;
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({ success: false, error: stderrData || `mongorestore exited with code ${code}` });
      }
    });

    readStream.pipe(gunzip).pipe(restore.stdin);
  });
}
