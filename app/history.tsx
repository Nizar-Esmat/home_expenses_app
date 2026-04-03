import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
