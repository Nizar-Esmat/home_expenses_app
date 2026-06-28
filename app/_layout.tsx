import { View, ActivityIndicator } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { StatusBar } from 'expo-status-bar';
import { DialogProvider } from '@/components/AppDialog';

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  return (
    <DialogProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Stack detachInactiveScreens={false} screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="add-expense" options={{ presentation: 'modal' }} />
          <Stack.Screen name="add-income" options={{ presentation: 'modal' }} />
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
          <Stack.Screen name="add-loan" options={{ presentation: 'modal' }} />
        </Stack>
      </View>
    </DialogProvider>
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
          <ThemeProvider>
            <RootLayoutNav />
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </View>
  );
}
