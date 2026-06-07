import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import pg from 'pg';
import fs from 'fs';

const { Pool } = pg;

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Database connection pooling config (PostgreSQL)
const poolConfig: any = {
  database: process.env.SQL_DB_NAME || 'factori',
  user: process.env.SQL_USER || 'postgres',
  password: process.env.SQL_PASSWORD || 'Ifyokowa@007',
  connectionTimeoutMillis: 5000, // 5 seconds connection timeout
};

const host = process.env.SQL_HOST || '35.222.179.40';
if (host.startsWith('/')) {
  poolConfig.host = host;
} else {
  poolConfig.host = host;
  poolConfig.port = 5432;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

// Table declarations for dynamic stores (acting as PostgreSQL relational schemas)
const TABLES = [
  'plants',
  'operators',
  'materials',
  'products',
  'inventory',
  'assets',
  'production',
  'incidents',
  'customers',
  'suppliers',
  'taxes',
  'purchase_orders',
  'sales_orders',
  'expenses',
  'sales',
  'banks',
  'employees',
  'attendance',
  'performance_reviews',
  'adjustments',
  'deductions',
  'payroll',
  'roles',
  'app_users',
  'organization_settings'
];

// --- High-Speed Local JSON Fallback Storage ---
const LOCAL_DB_PATH = path.join(process.cwd(), 'local_db.json');
let localDb: Record<string, Record<string, any>> = {};

function loadLocalDb() {
  try {
    if (fs.existsSync(LOCAL_DB_PATH)) {
      const content = fs.readFileSync(LOCAL_DB_PATH, 'utf-8');
      localDb = JSON.parse(content);
    } else {
      localDb = {};
      for (const table of TABLES) {
        localDb[table] = {};
      }
      saveLocalDb();
    }
  } catch (err) {
    console.error("Failed to load local DB:", err);
    localDb = {};
    for (const table of TABLES) {
      localDb[table] = {};
    }
  }
}

function saveLocalDb() {
  try {
    fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(localDb, null, 2), 'utf-8');
  } catch (err) {
    console.error("Failed to write to local DB:", err);
  }
}

async function localList(table: string) {
  const tableData = localDb[table] || {};
  return Object.keys(tableData).map(id => ({ id, ...tableData[id] }));
}

async function localGet(table: string, id: string) {
  const tableData = localDb[table] || {};
  if (!tableData[id]) return null;
  return { id, ...tableData[id] };
}

async function localSet(table: string, id: string, data: any) {
  if (!localDb[table]) localDb[table] = {};
  localDb[table][id] = data;
  saveLocalDb();
  return { id, ...data };
}

async function localUpdate(table: string, id: string, updates: any) {
  if (!localDb[table]) localDb[table] = {};
  const existing = localDb[table][id] || {};
  localDb[table][id] = { ...existing, ...updates };
  saveLocalDb();
}

async function localDelete(table: string, id: string) {
  if (localDb[table] && localDb[table][id]) {
    delete localDb[table][id];
    saveLocalDb();
  }
}

async function localQuery(table: string, filters: { field: string, op: string, value: any }[]) {
  const list = await localList(table);
  if (!filters || filters.length === 0) return list;
  return list.filter(item => {
    return filters.every(f => {
      const val = item[f.field];
      if (f.op === '==' || f.op === '=') {
        return String(val) === String(f.value);
      }
      return false;
    });
  });
}

// --- Connection state ---
let isPostgresConnected = false;
let connectionErrorMessage: string | null = null;

async function fetchAll(table: string) {
  if (isPostgresConnected) {
    const { rows } = await pool.query(`SELECT id, data FROM "${table}"`);
    return rows.map(r => ({ id: r.id, ...r.data }));
  }
  return localList(table);
}

async function fetchOne(table: string, id: string) {
  if (isPostgresConnected) {
    const { rows } = await pool.query(`SELECT id, data FROM "${table}" WHERE id = $1`, [id]);
    if (rows.length === 0) return null;
    return { id: rows[0].id, ...rows[0].data };
  }
  return localGet(table, id);
}

async function insertOne(table: string, id: string, data: any) {
  if (isPostgresConnected) {
    await pool.query(`
      INSERT INTO "${table}" (id, data) 
      VALUES ($1, $2) 
      ON CONFLICT (id) DO UPDATE SET data = $2
    `, [id, JSON.stringify(data)]);
    return { id, ...data };
  }
  return localSet(table, id, data);
}

async function updateOne(table: string, id: string, updates: any) {
  if (isPostgresConnected) {
    await pool.query(`
      INSERT INTO "${table}" (id, data)
      VALUES ($1, $2)
      ON CONFLICT (id) DO UPDATE SET data = "${table}".data || $2::jsonb
    `, [id, JSON.stringify(updates)]);
    return;
  }
  await localUpdate(table, id, updates);
}

async function deleteOne(table: string, id: string) {
  if (isPostgresConnected) {
    await pool.query(`DELETE FROM "${table}" WHERE id = $1`, [id]);
    return;
  }
  await localDelete(table, id);
}

async function queryAll(table: string, filters: any[]) {
  if (isPostgresConnected) {
    let queryText = `SELECT id, data FROM "${table}"`;
    const values: any[] = [];
    
    if (filters && filters.length > 0) {
      const conditions = filters.map((f, i) => {
        const safeField = f.field.replace(/[^a-zA-Z0-9_]/g, '');
        values.push(f.value);
        return `data->>'${safeField}' = $${i + 1}`;
      });
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    
    const { rows } = await pool.query(queryText, values);
    return rows.map(r => ({ id: r.id, ...r.data }));
  }
  return localQuery(table, filters);
}

async function initializeDatabase() {
  console.log("[Database] Checking connection to PostgreSQL at:", host);
  loadLocalDb();
  
  try {
    const client = await pool.connect();
    console.log("[Database] PostgreSQL connection verified!");
    
    for (const table of TABLES) {
      await client.query(`
        CREATE TABLE IF NOT EXISTS "${table}" (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL
        )
      `);
    }
    client.release();
    isPostgresConnected = true;
    console.log("[Database] Relational schemas loaded from Cloud SQL securely.");
  } catch (error: any) {
    isPostgresConnected = false;
    connectionErrorMessage = error.message || String(error);
    console.log("[Database] Offline-first developer mode initialized successfully with safe embedded storage.");
    console.log("[Database] Hint: Remote DB unreachable:", connectionErrorMessage);
  }
}

async function startServer() {
  await initializeDatabase();

  // Database Connection Status Diagnostic API
  app.get('/api/db-status', (req, res) => {
    let firebaseConfig: any = null;
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      }
    } catch (e) {
      console.warn("Failed to read firebase config in status api:", e);
    }

    res.json({
      connected: isPostgresConnected,
      type: isPostgresConnected ? 'postgresql' : 'local-json',
      error: connectionErrorMessage,
      host: host,
      firebaseConfig: firebaseConfig ? {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        firestoreDatabaseId: firebaseConfig.firestoreDatabaseId
      } : null
    });
  });

  // --- REST API for client db.ts proxying ---

  // 1. Fetch table items
  app.get('/api/db/:table', async (req, res) => {
    const { table } = req.params;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    try {
      const parsed = await fetchAll(table);
      res.json(parsed);
    } catch (error: any) {
      console.error(`Error listing ${table}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 2. Fetch single entry
  app.get('/api/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    try {
      const entry = await fetchOne(table, id);
      if (!entry) {
        return res.status(404).json({ error: 'Not found' });
      }
      res.json(entry);
    } catch (error: any) {
      console.error(`Error reading ${table}/${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Create or completely overwrite entry (analogous to setDoc)
  app.post('/api/db/:table', async (req, res) => {
    const { table } = req.params;
    const { id, ...data } = req.body;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    if (!id) {
      return res.status(400).json({ error: 'Missing row ID' });
    }
    try {
      const inserted = await insertOne(table, id, data);
      res.json(inserted);
    } catch (error: any) {
      console.error(`Error inserting into ${table}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 4. Update entry incrementally (analogous to updateDoc)
  app.put('/api/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    const updates = req.body;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    try {
      await updateOne(table, id, updates);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error updating ${table}/${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 5. Delete entry (analogous to deleteDoc)
  app.delete('/api/db/:table/:id', async (req, res) => {
    const { table, id } = req.params;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    try {
      await deleteOne(table, id);
      res.json({ success: true });
    } catch (error: any) {
      console.error(`Error deleting ${table}/${id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // 6. Custom search query endpoints
  app.post('/api/db-query/:table', async (req, res) => {
    const { table } = req.params;
    const filters: { field: string, op: string, value: any }[] = req.body;
    if (!TABLES.includes(table)) {
      return res.status(400).json({ error: 'Invalid table' });
    }
    try {
      const parsed = await queryAll(table, filters);
      res.json(parsed);
    } catch (error: any) {
      console.error(`Error querying ${table}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Support health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', host, dbConnected: isPostgresConnected });
  });

  // Vite middleware for dev / static serving for prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Critical server bootstrap error:", err);
});
