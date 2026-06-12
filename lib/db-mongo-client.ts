import { MongoClient, ObjectId } from "mongodb";

export interface MongoDBConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  connectionString?: string;
  ssl?: string;
}

function buildMongoUri(config: MongoDBConfig): string {
  if (config.connectionString) return config.connectionString;

  const host = config.host || "localhost";
  const port = config.port || 27017;
  const db = config.database || "admin";
  const ssl = config.ssl || "prefer";
  const sslParam = ssl !== "disable" ? "&ssl=true&tlsAllowInvalidCertificates=true" : "&ssl=false";

  if (config.user && config.password) {
    return `mongodb://${encodeURIComponent(config.user)}:${encodeURIComponent(config.password)}@${host}:${port}/${encodeURIComponent(db)}?authSource=admin${sslParam}`;
  }

  return `mongodb://${host}:${port}/${encodeURIComponent(db)}${sslParam}`;
}

function getClient(config: MongoDBConfig): MongoClient {
  const uri = buildMongoUri(config);
  return new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
}

export async function testMongoConnection(config: MongoDBConfig): Promise<{ success: boolean; error?: string }> {
  let client: MongoClient | undefined;
  try {
    client = getClient(config);
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Unknown error" };
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

export async function fetchMongoDatabases(config: MongoDBConfig): Promise<string[]> {
  let client: MongoClient | undefined;
  try {
    client = getClient(config);
    await client.connect();
    const adminDb = client.db("admin");
    const dbs = await adminDb.admin().listDatabases();
    const names = dbs.databases.map((d: any) => d.name).sort();
    if (names.length === 0 && config.database) {
      return [config.database];
    }
    return names;
  } catch (error) {
    console.error("Failed to fetch databases via listDatabases, falling back to configured database:", error);
    if (config.database) {
      return [config.database];
    }
    throw error;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

export async function fetchMongoCollections(config: MongoDBConfig, dbName?: string): Promise<string[]> {
  let client: MongoClient | undefined;
  try {
    client = getClient(config);
    await client.connect();
    const db = client.db(dbName || config.database || "admin");
    const collections = await db.listCollections().toArray();
    return collections.map((c) => c.name).sort();
  } catch (error) {
    console.error("Failed to fetch collections:", error);
    throw error;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

export async function fetchCollectionDocuments(
  config: MongoDBConfig,
  collectionName: string,
  page: number = 1,
  pageSize: number = 50,
  dbName?: string
): Promise<{ columns: string[]; rows: any[]; totalCount: number }> {
  let client: MongoClient | undefined;
  try {
    client = getClient(config);
    await client.connect();
    const db = client.db(dbName || config.database || "admin");
    const collection = db.collection(collectionName);

    const totalCount = await collection.countDocuments();
    const offset = (page - 1) * pageSize;
    const docs = await collection.find().sort({ _id: 1 }).skip(offset).limit(pageSize).toArray();

    const columns = collectAllKeys(docs);
    const rows = docs.map((doc) => {
      const row: Record<string, any> = {};
      for (const col of columns) {
        row[col] = getNestedValue(doc, col);
      }
      return row;
    });

    return { columns, rows, totalCount };
  } catch (error) {
    console.error(`Failed to fetch data for collection ${collectionName}:`, error);
    throw error;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

export async function fetchMongoDatabaseSize(config: MongoDBConfig): Promise<number> {
  let client: MongoClient | undefined;
  try {
    client = getClient(config);
    await client.connect();
    const db = client.db(config.database || "admin");
    const stats = await db.stats();
    return stats.dataSize || 0;
  } catch (error) {
    console.error("Failed to fetch database size:", error);
    throw error;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

function collectAllKeys(docs: any[]): string[] {
  const keySet = new Set<string>();
  for (const doc of docs) {
    flattenKeys(doc, "", keySet);
  }
  return Array.from(keySet).sort();
}

function flattenKeys(obj: any, prefix: string, keySet: Set<string>): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj !== "object" || Array.isArray(obj)) {
    keySet.add(prefix);
    return;
  }
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const val = obj[key];
    if (val !== null && val !== undefined && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date) && !(val instanceof ObjectId)) {
      flattenKeys(val, fullKey, keySet);
    } else {
      keySet.add(fullKey);
    }
  }
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = current[part];
  }
  return current;
}
