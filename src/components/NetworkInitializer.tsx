import React, { useEffect } from 'react';
import SimpleNetworkManager from '../utils/simpleNetworkManager';

const NetworkInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const initializeNetwork = async () => {
      try {
        const networkManager = SimpleNetworkManager.getInstance();
        console.log('📡 Simple network manager initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize network manager:', error);
      }
    };

    initializeNetwork();
  }, []);

  return <>{children}</>;
};

export default NetworkInitializer;