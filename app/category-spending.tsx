import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AllCategorySpendingScreen from '@/screens/AllCategorySpendingScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function CategorySpendingPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AllCategorySpendingScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
