import { SafeAreaView, StyleSheet } from 'react-native';
import SettingsScreen from '../src/screens/SettingsScreen';
import { useTheme } from '../src/theme/ThemeContext';

export default function SettingsPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <SettingsScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
