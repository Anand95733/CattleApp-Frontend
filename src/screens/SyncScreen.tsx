import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../contexts';
import OfflineSyncService from '../services/OfflineSyncService';
import { listUnsyncedSellersFIFO, getAllSellers } from '../database/repositories/sellerRepo';
import { listUnsyncedBeneficiariesFIFO, getAllBeneficiaries } from '../database/repositories/beneficiaryRepo';
import { listUnsyncedCattleFIFO, getAllCattle } from '../database/repositories/cattleRepo';

const SyncScreen = () => {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  const [online, setOnline] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [syncCounts, setSyncCounts] = useState({ sellers: 0, beneficiaries: 0, cattle: 0 });
  const [totalCounts, setTotalCounts] = useState({ sellers: 0, beneficiaries: 0, cattle: 0 });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncError, setSyncError] = useState<string | null>(null);

  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      console.log('📊 Loading sync screen data...');
      
      // Get unsynced data (pending sync)
      const [unsyncedSellers, unsyncedBeneficiaries, unsyncedCattle] = await Promise.all([
        listUnsyncedSellersFIFO().catch(err => {
          console.error('❌ Failed to load unsynced sellers:', err);
          return [];
        }),
        listUnsyncedBeneficiariesFIFO().catch(err => {
          console.error('❌ Failed to load unsynced beneficiaries:', err);
          return [];
        }),
        listUnsyncedCattleFIFO().catch(err => {
          console.error('❌ Failed to load unsynced cattle:', err);
          return [];
        }),
      ]);
      
      // Get total local data
      const [allSellers, allBeneficiaries, allCattle] = await Promise.all([
        getAllSellers().catch(err => {
          console.error('❌ Failed to load all sellers:', err);
          return [];
        }),
        getAllBeneficiaries().catch(err => {
          console.error('❌ Failed to load all beneficiaries:', err);
          return [];
        }),
        getAllCattle().catch(err => {
          console.error('❌ Failed to load all cattle:', err);
          return [];
        }),
      ]);
      
      console.log('📈 Data loaded:', {
        unsynced: { sellers: unsyncedSellers.length, beneficiaries: unsyncedBeneficiaries.length, cattle: unsyncedCattle.length },
        total: { sellers: allSellers.length, beneficiaries: allBeneficiaries.length, cattle: allCattle.length }
      });
      
      setSyncCounts({ 
        sellers: unsyncedSellers.length, 
        beneficiaries: unsyncedBeneficiaries.length, 
        cattle: unsyncedCattle.length 
      });
      
      setTotalCounts({ 
        sellers: allSellers.length, 
        beneficiaries: allBeneficiaries.length, 
        cattle: allCattle.length 
      });
    } catch (error) {
      console.error('❌ Failed to load counts:', error);
      // Set default values on error
      setSyncCounts({ sellers: 0, beneficiaries: 0, cattle: 0 });
      setTotalCounts({ sellers: 0, beneficiaries: 0, cattle: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadCounts();
      const state = await NetInfo.fetch();
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    } finally {
      setRefreshing(false);
    }
  }, [loadCounts]);

  useEffect(() => {
    const sub = NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    // Subscribe to sync status events
    const off = OfflineSyncService.getInstance().onStatus((e) => {
      setSyncStatus(e.message);
      setSyncError(e.error ?? null);
    });
    // Start initial load
    loadCounts();
    // Periodic refresh to reflect background sync progress
    const interval = setInterval(loadCounts, 3000);
    // Ensure background sync listener is running
    OfflineSyncService.getInstance().start();
    return () => {
      sub && sub();
      off && off();
      clearInterval(interval);
    };
  }, [loadCounts]);

  const totalPending = syncCounts.sellers + syncCounts.beneficiaries + syncCounts.cattle;
  const totalLocal = totalCounts.sellers + totalCounts.beneficiaries + totalCounts.cattle;
  const statusColor = useMemo(() => (online ? theme.colors.success : theme.colors.warning), [online, theme.colors.success, theme.colors.warning]);

  const handleSyncNow = async () => {
    if (!online) return; // Prevent sync when offline
    
    setSyncing(true);
    try {
      await OfflineSyncService.getInstance().manualSync();
      await loadCounts();
      setLastSyncedAt(new Date().toLocaleTimeString());
    } finally {
      setSyncing(false);
    }
  };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshAll} />}>      
      <View style={styles.headerRow}>
        <Ionicons name={online ? 'wifi' : 'wifi-off'} size={20} color={statusColor} />
        <Text style={[styles.statusText, { color: statusColor }]}> {online ? 'Online' : 'Offline'}</Text>
        {lastSyncedAt ? (
          <Text style={styles.lastSyncText}>Last Sync: {lastSyncedAt}</Text>
        ) : null}
      </View>

      {/* Local Data Overview */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="phone-portrait-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.cardTitle}>Local Data Stored</Text>
        </View>
        <Text style={styles.cardSubtitle}>Data saved on your device</Text>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.itemLabel}>Sellers</Text>
          </View>
          <Text style={styles.itemCount}>{totalCounts.sellers}</Text>
        </View>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.itemLabel}>Beneficiaries</Text>
          </View>
          <Text style={styles.itemCount}>{totalCounts.beneficiaries}</Text>
        </View>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <Ionicons name="paw-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.itemLabel}>Cattle</Text>
          </View>
          <Text style={styles.itemCount}>{totalCounts.cattle}</Text>
        </View>
        
        <View style={styles.divider} />
        <View style={styles.row}> 
          <Text style={styles.totalLabel}>Total Local Records</Text>
          <Text style={[styles.totalCount, { color: theme.colors.success }]}>{totalLocal}</Text>
        </View>
      </View>

      {/* Sync Queue */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="sync-outline" size={20} color={totalPending > 0 ? theme.colors.warning : theme.colors.success} />
          <Text style={styles.cardTitle}>Sync Queue</Text>
        </View>
        <Text style={styles.cardSubtitle}>
          {syncError ? `Error: ${syncError}` : (syncStatus || (totalPending > 0 ? 'Data waiting to sync to server' : 'All data is synced'))}
        </Text>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <View style={[styles.syncDot, { backgroundColor: syncCounts.sellers > 0 ? theme.colors.warning : theme.colors.success }]} />
            <Text style={styles.itemLabel}>Sellers</Text>
          </View>
          <Text style={[styles.itemCount, { color: syncCounts.sellers > 0 ? theme.colors.warning : theme.colors.textSecondary }]}>
            {syncCounts.sellers}
          </Text>
        </View>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <View style={[styles.syncDot, { backgroundColor: syncCounts.beneficiaries > 0 ? theme.colors.warning : theme.colors.success }]} />
            <Text style={styles.itemLabel}>Beneficiaries</Text>
          </View>
          <Text style={[styles.itemCount, { color: syncCounts.beneficiaries > 0 ? theme.colors.warning : theme.colors.textSecondary }]}>
            {syncCounts.beneficiaries}
          </Text>
        </View>
        
        <View style={styles.dataRow}> 
          <View style={styles.dataItem}>
            <View style={[styles.syncDot, { backgroundColor: syncCounts.cattle > 0 ? theme.colors.warning : theme.colors.success }]} />
            <Text style={styles.itemLabel}>Cattle</Text>
          </View>
          <Text style={[styles.itemCount, { color: syncCounts.cattle > 0 ? theme.colors.warning : theme.colors.textSecondary }]}>
            {syncCounts.cattle}
          </Text>
        </View>
        
        <View style={styles.divider} />
        <View style={styles.row}> 
          <Text style={styles.totalLabel}>Total Pending</Text>
          <Text style={[styles.totalCount, { color: totalPending > 0 ? theme.colors.warning : theme.colors.success }]}>
            {totalPending}
          </Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[
          styles.syncButton, 
          (!online || syncing) && styles.syncButtonDisabled
        ]} 
        onPress={handleSyncNow} 
        disabled={syncing || !online}
        activeOpacity={online ? 0.7 : 1}
      >
        {syncing ? (
          <>
            <ActivityIndicator color="#fff" size="small" />
            <Text style={styles.syncText}>Syncing...</Text>
          </>
        ) : (
          <>
            <Ionicons 
              name={online ? "sync" : "sync-outline"} 
              size={18} 
              color={online ? "#fff" : "#999"} 
            />
            <Text style={[styles.syncText, !online && styles.syncTextDisabled]}>
              {online ? "Sync Now" : "Connect to Internet"}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {!online && totalPending > 0 && (
        <View style={styles.infoBox}>
          <Ionicons name="wifi-off" size={18} color={theme.colors.warning} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            You have {totalPending} records waiting to sync. Connect to WiFi to upload them to the server.
          </Text>
        </View>
      )}

      {online && totalPending === 0 && (
        <View style={[styles.infoBox, { backgroundColor: theme.colors.success + '20' }]}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
          <Text style={[styles.infoText, { color: theme.colors.success }]}>
            All your data is synced with the server!
          </Text>
        </View>
      )}

      {online && totalPending > 0 && (
        <View style={[styles.infoBox, { backgroundColor: theme.colors.warning + '20' }]}>
          <Ionicons name="cloud-upload-outline" size={18} color={theme.colors.warning} />
          <Text style={[styles.infoText, { color: theme.colors.text }]}>
            Ready to sync {totalPending} records to the server. Tap "Sync Now" to upload.
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  lastSyncText: {
    marginLeft: 'auto',
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: theme.colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  dataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  itemLabel: {
    fontSize: 14,
    color: theme.colors.text,
  },
  itemCount: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text,
  },
  totalCount: {
    fontSize: 15,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  syncButton: {
    height: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  syncButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.6,
  },
  syncText: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 8,
  },
  syncTextDisabled: {
    color: '#999',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
  },
});

export default SyncScreen;