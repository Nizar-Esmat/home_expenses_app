import { SafeAreaView, StyleSheet } from 'react-native';
import HomeScreen from '../src/screens/HomeScreen';
import { useTheme } from '../src/theme/ThemeContext';

export default function Index() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
