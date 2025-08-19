import { getDB, CattleRow, nowIso } from '../sqlite';

export const insertCattleLocal = async (
  data: Omit<CattleRow, 'local_id' | 'createdAt' | 'updatedAt' | 'synced'>
) => {
  const db = await getDB();
  const createdAt = nowIso();
  const updatedAt = createdAt;
  const synced = 0;

  try {
    const result = await db.executeSql(
      `INSERT INTO cattle (
        server_id,
        seller_local_id,
        seller_server_id,
        beneficiary_local_id,
        beneficiary_server_id,
        purchase_place,
        cost,
        insurance_premium,
        type,
        breed,
        milk_yield_per_day,
        animal_age,
        pregnant,
        pregnancy_months,
        calf_type,
        tag_no,
        muzzle1_photo,
        muzzle2_photo,
        muzzle3_photo,
        front_photo,
        left_photo,
        right_photo,
        synced,
        createdAt,
        updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.server_id ?? null,
        data.seller_local_id ?? null,
        data.seller_server_id ?? null,
        data.beneficiary_local_id ?? null,
        data.beneficiary_server_id ?? null,
        data.purchase_place ?? null,
        data.cost ?? null,
        data.insurance_premium ?? null,
        data.type ?? null,
        data.breed ?? null,
        data.milk_yield_per_day ?? null,
        data.animal_age ?? null,
        data.pregnant ?? null,
        data.pregnancy_months ?? null,
        data.calf_type ?? null,
        data.tag_no ?? null,
        data.muzzle1_photo ?? null,
        data.muzzle2_photo ?? null,
        data.muzzle3_photo ?? null,
        data.front_photo ?? null,
        data.left_photo ?? null,
        data.right_photo ?? null,
        synced,
        createdAt,
        updatedAt,
      ]
    );
    return result[0].insertId as number;
  } catch (err: any) {
    console.error('❌ SQLite insertCattleLocal failed with args:', {
      server_id: data.server_id,
      seller_local_id: data.seller_local_id,
      seller_server_id: data.seller_server_id,
      beneficiary_local_id: data.beneficiary_local_id,
      beneficiary_server_id: data.beneficiary_server_id,
      purchase_place: data.purchase_place,
      cost: data.cost,
      insurance_premium: data.insurance_premium,
      type: data.type,
      breed: data.breed,
      milk_yield_per_day: data.milk_yield_per_day,
      animal_age: data.animal_age,
      pregnant: data.pregnant,
      pregnancy_months: data.pregnancy_months,
      calf_type: data.calf_type,
      tag_no: data.tag_no,
      muzzle1_photo: data.muzzle1_photo,
      muzzle2_photo: data.muzzle2_photo,
      muzzle3_photo: data.muzzle3_photo,
      front_photo: data.front_photo,
      left_photo: data.left_photo,
      right_photo: data.right_photo,
    });
    console.error('❌ SQLite error:', err?.message || err);
    throw err;
  }
  return result[0].insertId as number;
};

export const insertCattleSynced = async (
  data: Omit<CattleRow, 'local_id' | 'createdAt' | 'updatedAt' | 'synced'>
) => {
  const db = await getDB();
  const now = nowIso();
  await db.executeSql(
    `INSERT INTO cattle (
      server_id,
      seller_local_id,
      seller_server_id,
      beneficiary_local_id,
      beneficiary_server_id,
      purchase_place,
      cost,
      insurance_premium,
      type,
      breed,
      milk_yield_per_day,
      animal_age,
      pregnant,
      pregnancy_months,
      calf_type,
      tag_no,
      muzzle1_photo,
      muzzle2_photo,
      muzzle3_photo,
      front_photo,
      left_photo,
      right_photo,
      synced,
      createdAt,
      updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    [
      data.server_id ?? null,
      data.seller_local_id ?? null,
      data.seller_server_id ?? null,
      data.beneficiary_local_id ?? null,
      data.beneficiary_server_id ?? null,
      data.purchase_place ?? null,
      data.cost ?? null,
      data.insurance_premium ?? null,
      data.type ?? null,
      data.breed ?? null,
      data.milk_yield_per_day ?? null,
      data.animal_age ?? null,
      data.pregnant ?? null,
      data.pregnancy_months ?? null,
      data.calf_type ?? null,
      data.tag_no ?? null,
      data.muzzle1_photo ?? null,
      data.muzzle2_photo ?? null,
      data.muzzle3_photo ?? null,
      data.front_photo ?? null,
      data.left_photo ?? null,
      data.right_photo ?? null,
      now,
      now,
    ]
  );
};

export const updateCattleServerId = async (local_id: number, server_id: string) => {
  const db = await getDB();
  await db.executeSql(
    `UPDATE cattle SET server_id = ?, synced = 1, updatedAt = ? WHERE local_id = ?`,
    [server_id, nowIso(), local_id]
  );
};

export const listUnsyncedCattleFIFO = async (): Promise<CattleRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(
    `SELECT * FROM cattle WHERE synced = 0 ORDER BY datetime(createdAt) ASC`
  );
  const rows: CattleRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};

export const getCattleByLocalId = async (local_id: number): Promise<CattleRow | null> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM cattle WHERE local_id = ?`, [local_id]);
  if (res.rows.length === 0) return null;
  return res.rows.item(0);
};

export const getAllCattle = async (): Promise<CattleRow[]> => {
  const db = await getDB();
  const [res] = await db.executeSql(`SELECT * FROM cattle ORDER BY datetime(createdAt) DESC`);
  const rows: CattleRow[] = [];
  for (let i = 0; i < res.rows.length; i++) rows.push(res.rows.item(i));
  return rows;
};