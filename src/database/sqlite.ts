// SQLite setup and migrations
import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

SQLite.enablePromise(true);

let dbInstance: SQLiteDatabase | null = null;

const DB_NAME = 'milch.db';
const DB_LOCATION = 'default';
const SCHEMA_VERSION = 3;

export const getDB = async (): Promise<SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabase({ name: DB_NAME, location: DB_LOCATION });
  await migrate(dbInstance);
  return dbInstance;
};

// Force migration - useful for fixing migration issues
export const forceMigration = async (): Promise<void> => {
  const db = await getDB();
  console.log('🔧 Force running database migration...');
  
  try {
    // Ensure base tables exist (idempotent)
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

    await db.executeSql(`CREATE TABLE IF NOT EXISTS beneficiaries (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE,
      beneficiary_id TEXT UNIQUE,
      name TEXT NOT NULL,
      village TEXT,
      mandal TEXT,
      district TEXT,
      state TEXT,
      phone_number TEXT,
      num_of_items INTEGER,
      synced INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);

    await db.executeSql(`CREATE TABLE IF NOT EXISTS cattle (
      local_id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id TEXT UNIQUE,
      seller_local_id INTEGER,
      seller_server_id TEXT,
      beneficiary_local_id INTEGER,
      beneficiary_server_id TEXT,
      purchase_place TEXT,
      cost TEXT,
      insurance_premium TEXT,
      type TEXT,
      breed TEXT,
      milk_yield_per_day TEXT,
      animal_age TEXT,
      pregnant INTEGER,
      pregnancy_months TEXT,
      calf_type TEXT,
      tag_no TEXT,
      muzzle1_photo TEXT,
      muzzle2_photo TEXT,
      muzzle3_photo TEXT,
      front_photo TEXT,
      left_photo TEXT,
      right_photo TEXT,
      synced INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    )`);

    // Beneficiaries missing columns
    const [bInfo] = await db.executeSql(`PRAGMA table_info(beneficiaries)`);
    const bCols: string[] = [];
    for (let i = 0; i < bInfo.rows.length; i++) bCols.push(bInfo.rows.item(i).name);
    if (!bCols.includes('father_or_husband')) await db.executeSql(`ALTER TABLE beneficiaries ADD COLUMN father_or_husband TEXT`);
    if (!bCols.includes('aadhaar_id')) await db.executeSql(`ALTER TABLE beneficiaries ADD COLUMN aadhaar_id TEXT`);
    if (!bCols.includes('local_image_path')) await db.executeSql(`ALTER TABLE beneficiaries ADD COLUMN local_image_path TEXT`);

    // Cattle missing columns (ensure all expected columns exist with appropriate types)
    const [cInfo] = await db.executeSql(`PRAGMA table_info(cattle)`);
    const cCols: string[] = [];
    for (let i = 0; i < cInfo.rows.length; i++) cCols.push(cInfo.rows.item(i).name);

    const expected: Record<string, string> = {
      seller_local_id: 'INTEGER',
      seller_server_id: 'TEXT',
      beneficiary_local_id: 'INTEGER',
      beneficiary_server_id: 'TEXT',
      purchase_place: 'TEXT',
      cost: 'TEXT',
      insurance_premium: 'TEXT',
      type: 'TEXT',
      breed: 'TEXT',
      milk_yield_per_day: 'TEXT',
      animal_age: 'TEXT',
      pregnant: 'INTEGER',
      pregnancy_months: 'TEXT',
      calf_type: 'TEXT',
      tag_no: 'TEXT',
      muzzle1_photo: 'TEXT',
      muzzle2_photo: 'TEXT',
      muzzle3_photo: 'TEXT',
      front_photo: 'TEXT',
      left_photo: 'TEXT',
      right_photo: 'TEXT',
      synced: 'INTEGER DEFAULT 0',
      createdAt: 'TEXT',
      updatedAt: 'TEXT',
    };

    for (const [col, type] of Object.entries(expected)) {
      if (!cCols.includes(col)) {
        try {
          await db.executeSql(`ALTER TABLE cattle ADD COLUMN ${col} ${type}`);
        } catch (e) {
          // Ignore duplicate column errors in case of race conditions
          console.warn(`⚠️ Could not add column ${col}:`, e);
        }
      }
    }

    // Update schema version
    await db.executeSql(`INSERT OR REPLACE INTO meta(key, value) VALUES('schema_version', ?)`, [String(SCHEMA_VERSION)]);
    console.log('🎉 Force migration ensured tables and columns exist');
  } catch (error) {
    console.error('❌ Force migration failed:', error);
    throw error;
  }
};

// Reset database - useful for development/testing
export const resetDatabase = async (): Promise<void> => {
  console.log('🗑️ Resetting database...');
  
  try {
    if (dbInstance) {
      await dbInstance.close();
      dbInstance = null;
    }
    
    // Delete the database file
    await SQLite.deleteDatabase({ name: DB_NAME, location: DB_LOCATION });
    console.log('✅ Database deleted');
    
    // Recreate the database
    dbInstance = await SQLite.openDatabase({ name: DB_NAME, location: DB_LOCATION });
    await migrate(dbInstance);
    console.log('✅ Database recreated with latest schema');
    
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  }
};

const migrate = async (db: SQLiteDatabase) => {
  await db.transaction(async (tx) => {
    // Meta table
    await tx.executeSql(
      `CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )`
    );

    // Check version
    const [versionResult] = await tx.executeSql(`SELECT value FROM meta WHERE key = 'schema_version'`);
    const currentVersion = versionResult.rows.length > 0 ? parseInt(versionResult.rows.item(0).value, 10) : 0;

    if (currentVersion < 1) {
      // v1 tables
      await tx.executeSql(`CREATE TABLE IF NOT EXISTS sellers (
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

      await tx.executeSql(`CREATE TABLE IF NOT EXISTS beneficiaries (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        beneficiary_id TEXT UNIQUE,
        name TEXT NOT NULL,
        village TEXT,
        mandal TEXT,
        district TEXT,
        state TEXT,
        phone_number TEXT,
        num_of_items INTEGER,
        synced INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`);

      await tx.executeSql(`CREATE TABLE IF NOT EXISTS cattle (
        local_id INTEGER PRIMARY KEY AUTOINCREMENT,
        server_id TEXT UNIQUE,
        seller_local_id INTEGER,
        seller_server_id TEXT,
        beneficiary_local_id INTEGER,
        beneficiary_server_id TEXT,
        purchase_place TEXT,
        cost TEXT,
        insurance_premium TEXT,
        type TEXT,
        breed TEXT,
        milk_yield_per_day TEXT,
        animal_age TEXT,
        pregnant INTEGER,
        pregnancy_months TEXT,
        calf_type TEXT,
        tag_no TEXT,
        muzzle1_photo TEXT,
        muzzle2_photo TEXT,
        muzzle3_photo TEXT,
        front_photo TEXT,
        left_photo TEXT,
        right_photo TEXT,
        synced INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      )`);
    }

    if (currentVersion < 2) {
      // v2: Add father_or_husband, aadhaar_id, and local_image_path to beneficiaries
      try {
        console.log('🔄 Running database migration v1 -> v2...');
        
        // Check if columns already exist before adding them
        const [tableInfo] = await tx.executeSql(`PRAGMA table_info(beneficiaries)`);
        const existingColumns = [];
        for (let i = 0; i < tableInfo.rows.length; i++) {
          existingColumns.push(tableInfo.rows.item(i).name);
        }
        
        console.log('📋 Existing columns:', existingColumns);
        
        if (!existingColumns.includes('father_or_husband')) {
          await tx.executeSql(`ALTER TABLE beneficiaries ADD COLUMN father_or_husband TEXT`);
          console.log('✅ Added father_or_husband column');
        }
        
        if (!existingColumns.includes('aadhaar_id')) {
          await tx.executeSql(`ALTER TABLE beneficiaries ADD COLUMN aadhaar_id TEXT`);
          console.log('✅ Added aadhaar_id column');
        }
        
        if (!existingColumns.includes('local_image_path')) {
          await tx.executeSql(`ALTER TABLE beneficiaries ADD COLUMN local_image_path TEXT`);
          console.log('✅ Added local_image_path column');
        }
        
        console.log('🎉 Database migration v1 -> v2 completed successfully');
      } catch (error) {
        console.error('❌ Migration v1 -> v2 failed:', error);
        throw error;
      }
    }

    // Note: v3 hidden tables removed to keep deletes strictly offline only

    // Always update schema version at the end
    await tx.executeSql(`INSERT OR REPLACE INTO meta(key, value) VALUES('schema_version', ?)`, [String(SCHEMA_VERSION)]);
  });
};

export type SellerRow = {
  local_id?: number;
  server_id?: string | null;
  name: string;
  father_or_husband?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  phone_number?: string | null;
  synced?: number;
  createdAt: string;
  updatedAt: string;
};

export type BeneficiaryRow = {
  local_id?: number;
  server_id?: string | null; // server-side beneficiary_id or UUID
  beneficiary_id?: string | null; // client-provided id (if applicable)
  name: string;
  father_or_husband?: string | null;
  aadhaar_id?: string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  state?: string | null;
  phone_number?: string | null;
  num_of_items?: number | null;
  local_image_path?: string | null; // Path to locally stored image
  synced?: number;
  createdAt: string;
  updatedAt: string;
};

export type CattleRow = {
  local_id?: number;
  server_id?: string | null; // server-side animal_id
  seller_local_id?: number | null;
  seller_server_id?: string | null;
  beneficiary_local_id?: number | null;
  beneficiary_server_id?: string | null;
  purchase_place?: string | null;
  cost?: string | null;
  insurance_premium?: string | null;
  type?: string | null;
  breed?: string | null;
  milk_yield_per_day?: string | null;
  animal_age?: string | null;
  pregnant?: number | null; // 0/1
  pregnancy_months?: string | null;
  calf_type?: string | null;
  tag_no?: string | null;
  muzzle1_photo?: string | null;
  muzzle2_photo?: string | null;
  muzzle3_photo?: string | null;
  front_photo?: string | null;
  left_photo?: string | null;
  right_photo?: string | null;
  synced?: number;
  createdAt: string;
  updatedAt: string;
};

export const nowIso = () => new Date().toISOString();