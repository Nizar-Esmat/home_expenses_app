import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { StatusBar } from 'expo-status-bar';
import { DialogProvider } from '@/components/AppDialog';
import {
  initNotifications,
  syncReminderSchedule,
  addNotificationResponseListener,
} from '@/services/notifications';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { activeUser, switchUserByUuid, consumePendingRoute } = useUser();
  const router = useRouter();

  useEffect(() => {
    const pending = consumePendingRoute();
    if (pending) {
      router.push(pending as never);
    }
  }, [consumePendingRoute, router]);

  useEffect(() => {
    initNotifications();
    if (activeUser) {
      syncReminderSchedule(activeUser);
    }

    const unsubscribe = addNotificationResponseListener(async (action, userUuid) => {
      if (action === 'add-expense') {
        if (userUuid && activeUser && userUuid !== activeUser.uuid) {
          await switchUserByUuid(userUuid, '/add-expense');
        } else {
          router.push('/add-expense');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [activeUser, router, switchUserByUuid]);

  return (
    <DialogProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" />
          <Stack.Screen name="add-income" />
          <Stack.Screen name="daily-spending" />
          <Stack.Screen name="category-spending" />
          <Stack.Screen name="all-transactions" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="income-categories" />
          <Stack.Screen name="accounts" />
          <Stack.Screen name="add-account" />
          <Stack.Screen name="transfer" />
          <Stack.Screen name="transfers" />
          <Stack.Screen name="loans" />
          <Stack.Screen name="add-loan" />
        </Stack>
      </View>
    </DialogProvider>
  );
}

function UserScopedApp() {
  const { activeUser, ready } = useUser();

  if (!ready || !activeUser) {
    return (
      <View style={{ flex: 1, backgroundColor: '#091413', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#408A71" size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider key={activeUser.uuid}>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#091413', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#408A71" size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#091413' }}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#091413' }}>
          <UserProvider>
            <UserScopedApp />
          </UserProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </View>
  );
}
