import React, { useEffect } from 'react';
import { getDB } from '../database/sqlite';

const DatabaseInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const init = async () => {
      try {
        await getDB();
        console.log('🗄️ SQLite initialized');
      } catch (e) {
        console.error('❌ SQLite initialization failed:', e);
      }
    };
    init();
  }, []);

  return <>{children}</>;
};

export default DatabaseInitializer;