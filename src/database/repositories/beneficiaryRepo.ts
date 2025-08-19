import { getDB, BeneficiaryRow, nowIso } from '../sqlite';

export const insertBeneficiaryLocal = async (
  data: Omit<BeneficiaryRow, 'local_id' | 'createdAt' | 'updatedAt' | 'synced'>
) => {
  const db = await getDB();
  const createdAt = nowIso();
  const updatedAt = createdAt;

  // Ensure table exists first
  await db.executeSql(`CREATE TABLE IF NOT EXISTS beneficiaries (
    local_id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT UNIQUE,
    beneficiary_id TEXT UNIQUE,
    name TEXT NOT NULL,
    father_or_husband TEXT,
    aadhaar_id TEXT,
    village TEXT,
    mandal TEXT,
    district TEXT,
    state TEXT,
    phone_number TEXT,
    num_of_items INTEGER,
    local_image_path TEXT,
    synced INTEGER DEFAULT 0,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);

  // Check if beneficiary_id already exists
  const [existing] = await db.executeSql(
    `SELECT local_id FROM beneficiaries WHERE beneficiary_id = ?`,
    [data.beneficiary_id]
  );

  if (existing.rows.length > 0) {
    // Update existing record
    await db.executeSql(
      `UPDATE beneficiaries SET 
         name = ?, father_or_husband = ?, aadhaar_id = ?, village = ?, mandal = ?, district = ?, state = ?, 
         phone_number = ?, num_of_items = ?, local_image_path = ?, synced = 0, updatedAt = ?
       WHERE beneficiary_id = ?`,
      [
        data.name,
        data.father_or_husband,
        data.aadhaar_id,
        data.village,
        data.mandal,
        data.district,
        data.state,
        data.phone_number,
        data.num_of_items,
        data.local_image_path,
        updatedAt,
        data.beneficiary_id,
      ]
    );
    return existing.rows.item(0).local_id;
  } else {
    // Insert new record
    const [result] = await db.executeSql(
      `INSERT INTO beneficiaries (server_id, beneficiary_id, name, father_or_husband, aadhaar_id, village, mandal, district, state, phone_number, num_of_items, local_image_path, synced, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [
        data.server_id || null,
        data.beneficiary_id,
        data.name,
        data.father_or_husband,
        data.aadhaar_id,
        data.village,
        data.mandal,
        data.district,
        data.state,
        data.phone_number,
        data.num_of_items,
        data.local_image_path,
        createdAt,
        updatedAt,
      ]
    );
    return result.insertId as number;
  }
};

export const updateBeneficiaryServerId = async (local_id: number, server_id: string) => {
  const db = await getDB();
  await db.executeSql(
    `UPDATE beneficiaries SET server_id = ?, synced = 1, updatedAt = ? WHERE local_id = ?`,
    [server_id, nowIso(), local_id]
  );
};

export const insertBeneficiarySynced = async (server: {
  server_id: string; // beneficiary_id from server
  beneficiary_id?: string | null; // original client-provided id
  name: string;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  phone_number?: string | null;
  num_of_items?: number | null;
}) => {
  const db = await getDB();
  const now = nowIso();
  await db.executeSql(
    `INSERT INTO beneficiaries (server_id, beneficiary_id, name, village, mandal, district, state, phone_number, num_of_items, synced, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      server.server_id,
      server.beneficiary_id ?? null,
      server.name,
      server.village ?? null,
      server.mandal ?? null,
      server.district ?? null,
      server.state ?? null,
      server.phone_number ?? null,
      server.num_of_items ?? null,
      now,
      now,
    ]
  );
};

export const listUnsyncedBeneficiariesFIFO = async (): Promise<BeneficiaryRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(
    `SELECT * FROM beneficiaries WHERE synced = 0 ORDER BY datetime(createdAt) ASC`
  );
  const rows: BeneficiaryRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};

export const upsertBeneficiaryFromServer = async (server: BeneficiaryRow & { server_id: string }) => {
  const db = await getDB();
  const now = nowIso();
  
  // Check if exists by server_id
  const [existing] = await db.executeSql(
    `SELECT local_id FROM beneficiaries WHERE server_id = ?`,
    [server.server_id]
  );

  if (existing.rows.length > 0) {
    // Update existing
    await db.executeSql(
      `UPDATE beneficiaries SET 
         beneficiary_id = ?, name = ?, village = ?, mandal = ?, district = ?, 
         state = ?, phone_number = ?, num_of_items = ?, synced = 1, updatedAt = ?
       WHERE server_id = ?`,
      [
        server.beneficiary_id,
        server.name,
        server.village,
        server.mandal,
        server.district,
        server.state,
        server.phone_number,
        server.num_of_items,
        now,
        server.server_id,
      ]
    );
  } else {
    // Insert new
    await db.executeSql(
      `INSERT INTO beneficiaries (server_id, beneficiary_id, name, village, mandal, district, state, phone_number, num_of_items, synced, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        server.server_id,
        server.beneficiary_id,
        server.name,
        server.village,
        server.mandal,
        server.district,
        server.state,
        server.phone_number,
        server.num_of_items,
        now,
        now,
      ]
    );
  }
};

export const getBeneficiaryByLocalId = async (local_id: number): Promise<BeneficiaryRow | null> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM beneficiaries WHERE local_id = ?`, [local_id]);
  if (res.rows.length === 0) return null;
  return res.rows.item(0);
};

export const getBeneficiaryByServerId = async (server_id: string): Promise<BeneficiaryRow | null> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM beneficiaries WHERE server_id = ?`, [server_id]);
  if (res.rows.length === 0) return null;
  return res.rows.item(0);
};

export const clearAllBeneficiaries = async (): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM beneficiaries`);
  console.log('🗑️ All beneficiaries cleared from local database');
};

export const deleteBeneficiaryByLocalId = async (local_id: number): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM beneficiaries WHERE local_id = ?`, [local_id]);
  console.log(`🗑️ Beneficiary with local_id ${local_id} deleted from local database`);
};

export const deleteBeneficiaryByServerId = async (server_id: string): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM beneficiaries WHERE server_id = ?`, [server_id]);
  console.log(`🗑️ Beneficiary with server_id ${server_id} deleted from local database`);
};

export const deleteBeneficiaryByBeneficiaryId = async (beneficiary_id: string): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM beneficiaries WHERE beneficiary_id = ?`, [beneficiary_id]);
  console.log(`🗑️ Beneficiary with beneficiary_id ${beneficiary_id} deleted from local database`);
};

export const getAllBeneficiaries = async (): Promise<BeneficiaryRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM beneficiaries ORDER BY datetime(createdAt) DESC`);
  const rows: BeneficiaryRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};

// Hidden beneficiaries helpers
export const addHiddenBeneficiary = async (opts: { server_id?: string | null; beneficiary_id?: string | null }) => {
  const db = await getDB();
  await db.executeSql(
    `INSERT OR IGNORE INTO hidden_beneficiaries(server_id, beneficiary_id) VALUES(?, ?)`,
    [opts.server_id || null, opts.beneficiary_id || null]
  );
};

export const getHiddenBeneficiarySets = async (): Promise<{ serverIds: Set<string>; beneficiaryIds: Set<string> }> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT server_id, beneficiary_id FROM hidden_beneficiaries`);
  const serverIds = new Set<string>();
  const beneficiaryIds = new Set<string>();
  for (let i = 0; i < res.rows.length; i++) {
    const row = res.rows.item(i);
    if (row.server_id) serverIds.add(String(row.server_id));
    if (row.beneficiary_id) beneficiaryIds.add(String(row.beneficiary_id));
  }
  return { serverIds, beneficiaryIds };
};

export const clearHiddenBeneficiaries = async (): Promise<void> => {
  const db = await getDB();
  await db.executeSql(`DELETE FROM hidden_beneficiaries`);
};