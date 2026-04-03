import { SafeAreaView, StyleSheet } from 'react-native';
import AddExpenseScreen from '@/screens/AddExpenseScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function AddExpensePage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AddExpenseScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
