import { getDB, SellerRow, nowIso } from '../sqlite';

export const insertSellerLocal = async (
  data: Omit<SellerRow, 'local_id' | 'createdAt' | 'updatedAt' | 'synced'>
) => {
  const db = await getDB();
  const createdAt = nowIso();
  const updatedAt = createdAt;

  // Ensure table exists first
  await db.executeSql(`CREATE TABLE IF NOT EXISTS sellers (
    local_id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT UNIQUE,
    name TEXT NOT NULL,
    father_or_husband TEXT,
    village TEXT,
    mandal TEXT,
    district TEXT,
    state TEXT,
    phone_number TEXT,
    synced INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);

  // Simple insert - sellers don't have a unique client ID like beneficiaries
  const [result] = await db.executeSql(
    `INSERT INTO sellers (server_id, name, father_or_husband, aadhaar_id, village, mandal, district, state, phone_number, synced, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      data.server_id || null,
      data.name,
      data.father_or_husband,
      data.aadhaar_id || null,
      data.village,
      data.mandal,
      data.district,
      data.state,
      data.phone_number,
      createdAt,
      updatedAt,
    ]
  );
  return result.insertId as number;
};

export const updateSellerServerId = async (local_id: number, server_id: string) => {
  const db = await getDB();
  await db.executeSql(
    `UPDATE sellers SET server_id = ?, synced = 1, updatedAt = ? WHERE local_id = ?`,
    [server_id, nowIso(), local_id]
  );
};

export const insertSellerSynced = async (server: {
  server_id: string;
  name: string;
  father_or_husband?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  phone_number?: string | null;
}) => {
  const db = await getDB();
  const now = nowIso();
  await db.executeSql(
    `INSERT INTO sellers (server_id, name, father_or_husband, village, mandal, district, state, phone_number, synced, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      server.server_id,
      server.name,
      server.father_or_husband,
      server.village,
      server.mandal,
      server.district,
      server.state,
      server.phone_number,
      now,
      now,
    ]
  );
};

export const listUnsyncedSellersFIFO = async (): Promise<SellerRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(
    `SELECT * FROM sellers WHERE synced = 0 ORDER BY datetime(createdAt) ASC`
  );
  const rows: SellerRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};

export const upsertSellerFromServer = async (server: SellerRow & { server_id: string }) => {
  const db = await getDB();
  const now = nowIso();
  
  // Check if exists by server_id
  const [existing] = await db.executeSql(
    `SELECT local_id FROM sellers WHERE server_id = ?`,
    [server.server_id]
  );

  if (existing.rows.length > 0) {
    // Update existing
    await db.executeSql(
      `UPDATE sellers SET 
         name = ?, father_or_husband = ?, village = ?, mandal = ?, district = ?, 
         state = ?, phone_number = ?, synced = 1, updatedAt = ?
       WHERE server_id = ?`,
      [
        server.name,
        server.father_or_husband,
        server.village,
        server.mandal,
        server.district,
        server.state,
        server.phone_number,
        now,
        server.server_id,
      ]
    );
  } else {
    // Insert new
    await db.executeSql(
      `INSERT INTO sellers (server_id, name, father_or_husband, village, mandal, district, state, phone_number, synced, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        server.server_id,
        server.name,
        server.father_or_husband,
        server.village,
        server.mandal,
        server.district,
        server.state,
        server.phone_number,
        now,
        now,
      ]
    );
  }
};

export const getSellerByLocalId = async (local_id: number): Promise<SellerRow | null> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM sellers WHERE local_id = ?`, [local_id]);
  if (res.rows.length === 0) return null;
  return res.rows.item(0);
};

export const getSellerByServerId = async (server_id: string): Promise<SellerRow | null> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM sellers WHERE server_id = ?`, [server_id]);
  if (res.rows.length === 0) return null;
  return res.rows.item(0);
};

export const getAllSellers = async (): Promise<SellerRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM sellers ORDER BY datetime(createdAt) DESC`);
  const rows: SellerRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};

export const clearAllSellers = async (): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM sellers`);
  console.log('🗑️ All sellers cleared from local database');
};

export const deleteSellerByLocalId = async (local_id: number): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM sellers WHERE local_id = ?`, [local_id]);
  console.log(`🗑️ Seller with local_id ${local_id} deleted from local database`);
};

export const deleteSellerByServerId = async (server_id: string): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM sellers WHERE server_id = ?`, [server_id]);
  console.log(`🗑️ Seller with server_id ${server_id} deleted from local database`);
};

// Hidden sellers helpers
export const addHiddenSeller = async (server_id: string | null | undefined) => {
  if (!server_id) return;
  const db = await getDB();
  await db.executeSql(`INSERT OR IGNORE INTO hidden_sellers(server_id) VALUES(?)`, [server_id]);
};

export const getHiddenSellerSet = async (): Promise<Set<string>> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT server_id FROM hidden_sellers`);
  const ids = new Set<string>();
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows.item(i);
    if (row.server_id) ids.add(String(row.server_id));
  }
  return ids;
};

export const clearHiddenSellers = async (): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM hidden_sellers`);
};