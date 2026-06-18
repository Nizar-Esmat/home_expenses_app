import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AllDailySpendingScreen from '@/screens/AllDailySpendingScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function DailySpendingPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AllDailySpendingScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
