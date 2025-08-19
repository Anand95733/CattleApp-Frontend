import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Ionicons from 'react-native-vector-icons/Ionicons';
import NetworkDebugPanel from '../components/NetworkDebugPanel';
import { useTheme } from '../contexts';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const { theme, isDark, toggleTheme } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showNetworkDebug, setShowNetworkDebug] = useState(false);
  
  // Create dynamic styles
  const styles = createStyles(theme);

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.auth.signOut();
              if (error) {
                Alert.alert('Error', error.message);
              } else {
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                });
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            } finally {
              setLoading(false);
            }
          } 
        },
      ],
      { cancelable: true }
    );
  };

  const settingsItems = [
    {
      title: 'Account',
      icon: 'person-outline',
      onPress: () => navigation.navigate('Profile' as never),
    },
    {
      title: 'Notifications',
      icon: 'notifications-outline',
      rightComponent: (
        <Switch
          value={notificationsEnabled}
          onValueChange={setNotificationsEnabled}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={notificationsEnabled ? '#f4f3f4' : '#f4f3f4'}
        />
      ),
    },
    {
      title: 'Dark Mode',
      icon: 'contrast-outline',
      rightComponent: (
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          trackColor={{ false: '#767577', true: theme.colors.primary }}
          thumbColor={isDark ? '#f4f3f4' : '#f4f3f4'}
        />
      ),
    },
    {
      title: 'Privacy & Security',
      icon: 'shield-checkmark-outline',
      onPress: () => navigation.navigate('Privacy' as never),
    },
    {
      title: 'Test Connection',
      icon: 'wifi-outline',
      onPress: () => navigation.navigate('TestConnection' as never),
    },
    {
      title: 'Network Debug',
      icon: 'settings-outline',
      onPress: () => setShowNetworkDebug(!showNetworkDebug),
    },
    {
      title: 'Sync Now',
      icon: 'sync-outline',
      onPress: async () => {
        const { default: OfflineSyncService } = await import('../services/OfflineSyncService');
        await OfflineSyncService.getInstance().manualSync().catch(() => {});
        Alert.alert('Sync', 'Manual sync triggered.');
      }
    },
    {
      title: 'Help & Support',
      icon: 'help-circle-outline',
      onPress: () => navigation.navigate('Support' as never),
    },
    {
      title: 'About',
      icon: 'information-circle-outline',
      onPress: () => navigation.navigate('About' as never),
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.profileImage}
        />
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        {settingsItems.slice(0, 3).map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.item}
            onPress={item.onPress}
            disabled={!item.onPress}
          >
            <View style={styles.itemLeft}>
              <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
              <Text style={styles.itemText}>{item.title}</Text>
            </View>
            {item.rightComponent}
          </TouchableOpacity>
        ))}
      </View>



      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        {[settingsItems[3], settingsItems[4], settingsItems[5]].map((item, index) => (
          <TouchableOpacity 
            key={index} 
            style={styles.item}
            onPress={item.onPress}
          >
            <View style={styles.itemLeft}>
              <Ionicons name={item.icon} size={22} color={theme.colors.primary} />
              <Text style={styles.itemText}>{item.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {showNetworkDebug && (
        <View style={styles.section}>
          <NetworkDebugPanel />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <TouchableOpacity 
          style={styles.item}
          onPress={settingsItems[6].onPress}
        >
          <View style={styles.itemLeft}>
            <Ionicons name={settingsItems[6].icon} size={22} color={theme.colors.primary} />
            <Text style={styles.itemText}>{settingsItems[6].title}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
        disabled={loading}
      >
        <Ionicons name="log-out-outline" size={22} color="#ff4444" />
        <Text style={styles.logoutText}>
          {loading ? 'Logging Out...' : 'Logout'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>App Version 1.0.0</Text>
    </ScrollView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: theme.colors.background,
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    paddingLeft: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.surface,
    borderRadius: 10,
    marginBottom: 10,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    marginLeft: 15,
    color: theme.colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: theme.dark ? '#2a1a1a' : '#ffeeee',
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff4444',
    marginLeft: 10,
  },
  versionText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: 14,
    marginTop: 10,
  },
});

export default SettingsScreen;