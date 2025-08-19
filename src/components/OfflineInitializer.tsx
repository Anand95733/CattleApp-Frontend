import React, { useEffect } from 'react';
import OfflineSyncService from '../services/OfflineSyncService';

const OfflineInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const svc = OfflineSyncService.getInstance();
    svc.start();
    return () => svc.stop();
  }, []);

  return <>{children}</>;
};

export default OfflineInitializer;