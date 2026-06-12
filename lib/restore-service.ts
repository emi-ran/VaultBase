import { spawn } from "child_process"
import zlib from "zlib"

export interface RestoreConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
}

async function runPsql(
  args: string[],
  env: NodeJS.ProcessEnv,
  stdinContent?: string
): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const psql = spawn("psql", args, { env })
    let stderrData = ""

    psql.stderr.on("data", (data) => { stderrData += data.toString() })
    psql.on("error", (err) => resolve({ code: null, stderr: err.message }))
    psql.on("close", (code) => resolve({ code, stderr: stderrData }))

    if (stdinContent) {
      psql.stdin.write(stdinContent)
      psql.stdin.end()
    }
  })
}

export async function runRestore(
  readStream: NodeJS.ReadableStream,
  dbConfig: RestoreConfig
): Promise<{ success: boolean; error?: string }> {
  const env = { ...process.env, PGPASSWORD: dbConfig.password }
  const psqlBase = [
    "-h", dbConfig.host,
    "-p", String(dbConfig.port),
    "-U", dbConfig.user,
    "-d", dbConfig.database,
  ]

  // Step 1: Drop and recreate public schema for clean override
  const cleanup = await runPsql([
    ...psqlBase,
    "-v", "ON_ERROR_STOP=1",
    "-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"
  ], env)

  if (cleanup.code !== 0) {
    return { success: false, error: `Schema cleanup failed: ${cleanup.stderr}` }
  }

  // Step 2: Pipe the decompressed backup into psql
  // ON_ERROR_STOP is intentionally omitted: existing backups taken without
  // --if-exists contain DROP TABLE (without IF EXISTS) that will error on
  // the now-empty schema. psql continues past these benign errors.
  return new Promise((resolve) => {
    const restorePsql = spawn("psql", psqlBase, { env })

    let stderrData = ""
    restorePsql.stderr.on("data", (data) => {
      stderrData += data.toString()
    })

    const gunzip = zlib.createGunzip()
    gunzip.pipe(restorePsql.stdin)

    readStream.on("data", (chunk) => { gunzip.write(chunk) })
    readStream.on("end", () => { gunzip.end() })
    readStream.on("error", (err) => {
      gunzip.destroy()
      restorePsql.kill()
      resolve({ success: false, error: err.message || "Read stream failed" })
    })

    let hasErrorOccurred = false

    restorePsql.on("error", (err) => {
      hasErrorOccurred = true
      gunzip.destroy()
      restorePsql.kill()
      resolve({ success: false, error: err.message || "psql process failed" })
    })

    restorePsql.on("close", (code) => {
      if (hasErrorOccurred) return
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: stderrData || `psql exited with code ${code}` })
      }
    })
  })
}
