import { SafeAreaView, StyleSheet } from 'react-native';
import AddExpenseScreen from '../src/screens/AddExpenseScreen';
import { useTheme } from '../src/theme/ThemeContext';

export default function AddExpensePage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AddExpenseScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
