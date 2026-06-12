import { spawn } from "child_process";
import zlib from "zlib";

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
  dbConfig: MongoRestoreConfig
): Promise<{ success: boolean; error?: string }> {
  const sslParam = dbConfig.ssl !== "disable" ? "&ssl=true&tlsAllowInvalidCertificates=true" : "&ssl=false";
  const uri = `mongodb://${encodeURIComponent(dbConfig.user)}:${encodeURIComponent(dbConfig.password)}@${dbConfig.host}:${dbConfig.port}/${encodeURIComponent(dbConfig.database)}?authSource=admin${sslParam}`;

  return new Promise((resolve) => {
    const restore = spawn("mongorestore", [
      `--uri=${uri}`,
      "--archive",
      "--drop",
    ]);

    let stderrData = "";
    restore.stderr.on("data", (data) => {
      stderrData += data.toString();
    });

    const gunzip = zlib.createGunzip();
    gunzip.pipe(restore.stdin);

    readStream.on("data", (chunk) => { gunzip.write(chunk); });
    readStream.on("end", () => { gunzip.end(); });
    readStream.on("error", (err) => {
      gunzip.destroy();
      restore.kill();
      resolve({ success: false, error: err.message || "Read stream failed" });
    });

    let hasErrorOccurred = false;

    restore.on("error", (err) => {
      hasErrorOccurred = true;
      gunzip.destroy();
      restore.kill();
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
