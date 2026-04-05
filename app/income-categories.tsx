import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import IncomeCategoryManagerScreen from '@/screens/IncomeCategoryManagerScreen';

export default function IncomeCategoriesPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <IncomeCategoryManagerScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });