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
  pageSize: number = 50
): Promise<{ columns: string[]; rows: any[]; totalCount: number }> {
  // 1. Safety check: Validate table name contains only safe characters
  if (!/^[a-zA-Z0-9_.-]+$/.test(tableName)) {
    throw new Error("Invalid table name");
  }

  // 2. Fetch list of tables first to prevent SQL injection by verifying table exists
  const tables = await fetchPostgresTables(config);
  if (!tables.includes(tableName)) {
    throw new Error(`Table "${tableName}" not found in database`);
  }

  const clientConfig = getClientConfig(config);
  const client = new pg.Client(clientConfig);

  try {
    await client.connect();

    // Fetch total row count
    const countRes = await client.query(`SELECT COUNT(*) as count FROM "public"."${tableName}";`);
    const totalCount = parseInt(countRes.rows[0].count, 10);

    // Fetch paginated data
    const offset = (page - 1) * pageSize;
    const dataRes = await client.query(`
      SELECT * FROM "public"."${tableName}" 
      LIMIT $1 OFFSET $2;
    `, [pageSize, offset]);

    await client.end();

    // Extract columns and rows
    const columns = dataRes.fields.map((field) => field.name);
    return {
      columns,
      rows: dataRes.rows,
      totalCount,
    };
  } catch (error) {
    console.error(`Failed to fetch data for table ${tableName}:`, error);
    try {
      await client.end();
    } catch {}
    throw error;
  }
}
