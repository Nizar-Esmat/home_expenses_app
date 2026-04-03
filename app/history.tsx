import { SafeAreaView, StyleSheet } from 'react-native';
import HistoryScreen from '@/screens/HistoryScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function HistoryPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <HistoryScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
