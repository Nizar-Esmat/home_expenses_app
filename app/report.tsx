import { SafeAreaView, StyleSheet } from 'react-native';
import ReportScreen from '@/screens/ReportScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function ReportPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ReportScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
