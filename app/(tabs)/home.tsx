import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '@/screens/HomeScreen';
import { useTheme } from '@/theme/ThemeContext';
import TabSlideWrapper from '@/components/TabSlideWrapper';

export default function HomeTab() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <TabSlideWrapper>
        <HomeScreen />
      </TabSlideWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
