import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BottomTabs from './BottomTabs';
import AuthNavigator from './AuthNavigator';
import { supabase } from '../lib/supabase';
import AddBeneficiaryScreenFixed from '../screens/beneficiary/AddBeneficiaryScreenFixed';
import AddSellerScreenFixed from '../screens/seller/AddSellerScreenFixed';
import AddCattleScreen from '../screens/cattle/AddCattleScreen';
import CattleDetailsScreen from '../screens/cattle/CattleDetailsScreen';
import CattleDetailsFromScanScreen from '../screens/cattle/CattleDetailsFromScanScreen';
import CattleVisitScreen from '../screens/cattle/CattleVisitScreen';
import AddVisitScreen from '../screens/cattle/AddVisitScreen';
import BeneficiaryProfileScreen from '../screens/beneficiary/BeneficiaryProfileScreen';
import BeneficiaryDetailsScreen from '../screens/beneficiary/BeneficiaryDetailsScreen';
import SellerProfileScreen from '../screens/seller/SellerProfileScreen';
import TestAPIScreen from '../screens/TestAPIScreen';
import TestConnectionScreen from '../screens/TestConnectionScreen';
import MuzzleDetectionScreen from '../screens/MuzzleDetectionScreen';
import { RootStackParamList } from './types';
import SyncReminder from '../components/SyncReminder';

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data?.session ?? null);
      setLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Start background sync when user is logged in
      if (session) {
        try { OfflineSyncService.getInstance().start(); } catch {}
      }
    });

    // Also start sync on mount if already logged in
    try { OfflineSyncService.getInstance().start(); } catch {}

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (loading) return null; // Or splash screen

  return (
    <NavigationContainer>
      {session ? (
        <>
          {/* Sync reminder only after login */}
          <SyncReminder />
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            
            <Stack.Screen name="MainTabs" component={BottomTabs} />
          <Stack.Screen name="AddBeneficiary" component={AddBeneficiaryScreenFixed} />
          <Stack.Screen name="AddSeller" component={AddSellerScreenFixed} />
          <Stack.Screen name="AddCattle" component={AddCattleScreen} />
          <Stack.Screen name="CattleDetails" component={CattleDetailsScreen} />
          <Stack.Screen name="CattleDetailsFromScan" component={CattleDetailsFromScanScreen} />
          <Stack.Screen name="CattleVisit" component={CattleVisitScreen} />
          <Stack.Screen name="AddVisit" component={AddVisitScreen} />
          <Stack.Screen name="BeneficiaryProfile" component={BeneficiaryProfileScreen} />
          <Stack.Screen name="BeneficiaryDetails" component={BeneficiaryDetailsScreen} />
          <Stack.Screen name="SellerProfile" component={SellerProfileScreen} />
          <Stack.Screen name="TestAPI" component={TestAPIScreen} />
          <Stack.Screen name="TestConnection" component={TestConnectionScreen} />
          <Stack.Screen 
            name="MuzzleDetection" 
            component={MuzzleDetectionScreen}
            options={{ title: 'AI Muzzle Detection' }}
          />
        </Stack.Navigator>
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

export default AppNavigator;
