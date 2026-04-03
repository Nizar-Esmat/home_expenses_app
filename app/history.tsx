import { SafeAreaView, StyleSheet } from 'react-native';
import HistoryScreen from '../src/screens/HistoryScreen';
import { useTheme } from '../src/theme/ThemeContext';

export default function HistoryPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <HistoryScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
