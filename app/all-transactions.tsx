import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AllTransactionsScreen from '@/screens/AllTransactionsScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function AllTransactionsPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}> 
      <AllTransactionsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
