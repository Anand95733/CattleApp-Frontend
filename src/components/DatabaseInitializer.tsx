import React, { useEffect } from 'react';
import { getDB, forceMigration } from '../database/sqlite';

const DatabaseInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const init = async () => {
      try {
        await getDB();
        await forceMigration();
        console.log('🗄️ SQLite initialized and migrated');
      } catch (e) {
        console.error('❌ SQLite initialization failed:', e);
      }
    };
    init();
  }, []);

  return <>{children}</>;
};

export default DatabaseInitializer;