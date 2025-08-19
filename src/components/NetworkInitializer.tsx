import React, { useEffect } from 'react';
import SimpleNetworkManager from '../utils/simpleNetworkManager';

const NetworkInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        SimpleNetworkManager.getInstance();
        console.log('📡 Simple network manager initialized successfully');
        // Removed healthcheck/fallback probing to avoid unexpected GETs
      } catch (error) {
        console.error('❌ Failed to initialize network manager:', error);
      }
    };

    initializeNetwork();
  }, []);

  return <>{children}</>;
};

export default NetworkInitializer;