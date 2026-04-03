import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SettingsScreen from '@/screens/SettingsScreen';
import { useTheme } from '@/theme/ThemeContext';

export default function SettingsPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <SettingsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
