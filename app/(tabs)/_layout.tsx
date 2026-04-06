import { Tabs, usePathname, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const TAB_ITEMS = [
  { name: 'home', title: 'Home', icon: 'home' as const, iconOutline: 'home-outline' as const },
  { name: 'statistics', title: 'Statistics', icon: 'stats-chart' as const, iconOutline: 'stats-chart-outline' as const },
  { name: 'settings', title: 'Settings', icon: 'settings' as const, iconOutline: 'settings-outline' as const },
];

function FloatingTabBar() {
  const { colors, isDark } = useTheme();
  const pathname = usePathname();
  
  const tabBarBg = isDark ? '#0A0A0A' : '#FFFFFF';
  const selectedBg = isDark ? colors.primary + '30' : colors.primary + '20';

  const getActiveIndex = () => {
    if (pathname.includes('home')) return 0;
    if (pathname.includes('statistics')) return 1;
    if (pathname.includes('settings')) return 2;
    return 0;
  };

  const activeIndex = getActiveIndex();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.tabBar, { backgroundColor: tabBarBg }]}>
        {TAB_ITEMS.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.tabItem, isActive && { backgroundColor: selectedBg }]}
              onPress={() => router.push(`/${item.name}` as any)}
            >
              <Ionicons
                name={isActive ? item.icon : item.iconOutline}
                size={22}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textSecondary }]}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      >
        <Tabs.Screen name="home" />
        <Tabs.Screen name="statistics" />
        <Tabs.Screen name="settings" />
      </Tabs>
      <FloatingTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 34 : 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    height: 70,
    width: '92%',
    maxWidth: 400,
    borderRadius: 24,
    paddingHorizontal: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 2,
    borderRadius: 16,
    height: 52,
    maxWidth: 120,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
});
