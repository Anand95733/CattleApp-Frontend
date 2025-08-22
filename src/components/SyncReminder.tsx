import React, { useEffect, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { listUnsyncedSellersFIFO } from '../database/repositories/sellerRepo';
import { listUnsyncedBeneficiariesFIFO } from '../database/repositories/beneficiaryRepo';
import { listUnsyncedCattleFIFO } from '../database/repositories/cattleRepo';
import OfflineSyncService from '../services/OfflineSyncService';

// Shows a one-time popup when device goes online and there is unsynced data
// Keeps it minimal and non-intrusive.
const SyncReminder: React.FC = () => {
  const [lastPromptAt, setLastPromptAt] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      if (!online) return;

      // Rate-limit prompts to once per 30 seconds
      const now = Date.now();
      if (now - lastPromptAt < 30000) return;

      try {
        const [sellers, beneficiaries, cattle] = await Promise.all([
          listUnsyncedSellersFIFO(),
          listUnsyncedBeneficiariesFIFO(),
          listUnsyncedCattleFIFO(),
        ]);
        const total = sellers.length + beneficiaries.length + cattle.length;
        if (total === 0) return;

        setLastPromptAt(now);

        const message = `You have ${total} unsynced item(s).\n` +
          `• Sellers: ${sellers.length}\n` +
          `• Beneficiaries: ${beneficiaries.length}\n` +
          `• Cattle: ${cattle.length}\n\n` +
          `Would you like to sync now?`;

        const doSync = async () => {
          try {
            await OfflineSyncService.getInstance().manualSync();
            if (Platform.OS === 'android') {
              ToastAndroid.show('Sync started…', ToastAndroid.SHORT);
            }
          } catch (e) {
            console.warn('Sync failed to start:', e);
          }
        };

        if (Platform.OS === 'android') {
          Alert.alert('Sync Reminder', message, [
            { text: 'Later', style: 'cancel' },
            { text: 'Sync Now', onPress: doSync },
          ]);
        } else {
          Alert.alert('Sync Reminder', message, [
            { text: 'Later', style: 'cancel' },
            { text: 'Sync Now', onPress: doSync },
          ]);
        }
      } catch (e) {
        console.warn('Failed checking unsynced data:', e);
      }
    });

    return () => unsubscribe();
  }, [lastPromptAt]);

  return null;
};

export default SyncReminder;