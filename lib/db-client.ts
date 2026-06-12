import pg from "pg";

export interface DBConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
  ssl?: string;
}

function getClientConfig(config: DBConfig): pg.ClientConfig {
  if (config.connectionString) {
    const sslMode = config.ssl || "prefer";
    return {
      connectionString: config.connectionString,
      ssl: sslMode !== "disable" ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    };
  }

  const sslMode = config.ssl || "prefer";
  return {
    host: config.host,
    port: config.port || 5432,
    user: config.user,
    password: config.password,
    database: config.database,
    ssl: sslMode !== "disable" ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000,
  };
}

export async function testPostgresConnection(config: DBConfig): Promise<{ success: boolean; error?: string }> {
  const clientConfig = getClientConfig(config);
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    // Run a simple query to verify permissions
    await client.query("SELECT 1;");
    await client.end();
    return { success: true };
  } catch (error: any) {
    console.error("Database test connection failed:", error);
    try {
      await client.end();
    } catch {}
    return { success: false, error: error?.message || "Unknown error" };
  }
}

export async function fetchPostgresTables(config: DBConfig): Promise<string[]> {
  const clientConfig = getClientConfig(config);
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);
    await client.end();
    return res.rows.map((row) => row.table_name);
  } catch (error) {
    console.error("Failed to fetch tables:", error);
    try {
      await client.end();
    } catch {}
    throw error;
  }
}

export async function fetchTableData(
  config: DBConfig,
  tableName: string,
  page: number = 1,
  pageSize: number = 50,
  skipValidation: boolean = false
): Promise<{ columns: string[]; rows: any[]; totalCount: number }> {
  if (!/^[a-zA-Z0-9_.-]+$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  if (!skipValidation) {
    const tables = await fetchPostgresTables(config);
    if (!tables.includes(tableName)) {
      throw new Error(`Table "${tableName}" not found in database`);
    }
  }

  const clientConfig = getClientConfig(config);
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();

    let totalCount: number;

    const approxRes = await client.query(
      `SELECT reltuples::bigint AS count FROM pg_class WHERE oid = $1::regclass`,
      [tableName]
    );
    const approxCount = parseInt(approxRes.rows[0].count, 10);

    if (approxCount > 10000) {
      totalCount = approxCount;
    } else {
      const countRes = await client.query(`SELECT COUNT(*) as count FROM "public"."${tableName}";`);
      totalCount = parseInt(countRes.rows[0].count, 10);
    }

    const offset = (page - 1) * pageSize;
    const dataRes = await client.query(`
      SELECT * FROM "public"."${tableName}" 
      LIMIT $1 OFFSET $2;
    `, [pageSize, offset]);

    await client.end();

    const columns = dataRes.fields.map((field) => field.name);
    return { columns, rows: dataRes.rows, totalCount };
  } catch (error) {
    console.error(`Failed to fetch data for table ${tableName}:`, error);
    try {
      await client.end();
    } catch {}
    throw error;
  }
}

export async function fetchDatabaseSize(config: DBConfig): Promise<number> {
  const clientConfig = getClientConfig(config);
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();
    const res = await client.query("SELECT pg_database_size(current_database()) as size;");
    await client.end();
    return parseInt(res.rows[0].size, 10);
  } catch (error) {
    console.error("Failed to fetch database size:", error);
    try {
      await client.end();
    } catch {}
    throw error;
  }
}

