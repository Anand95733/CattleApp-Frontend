import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import NetworkInitializer from './components/NetworkInitializer';
import { LocationProvider } from './contexts/LocationContext';
import { ThemeProvider } from './contexts/ThemeContext';
// Temporarily disabled problematic imports:
// import { preloadCriticalData, getNetworkAwareTimeout } from './config/api';
// import { perf } from './utils/performance';
// import { optimizeDjangoConnection } from './utils/djangoOptimizer';
// import { initializeConnectionMonitoring } from './utils/connectionMonitor';

const App = () => {
  // Temporarily disabled complex initialization to isolate hook issue
  // useEffect(() => {
  //   const initializeApp = async () => {
  //     console.log('🚀 Milch App starting...');
  //     // Simplified initialization
  //   };
  //   initializeApp();
  // }, []);

  return (
    <ThemeProvider>
      <LocationProvider>
        <NetworkInitializer>
          <AppNavigator />
        </NetworkInitializer>
      </LocationProvider>
    </ThemeProvider>
  );
};

export default App;
