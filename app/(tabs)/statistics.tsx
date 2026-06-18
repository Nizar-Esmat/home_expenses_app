import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatisticsScreen from '@/screens/StatisticsScreen';
import { useTheme } from '@/theme/ThemeContext';
import TabSlideWrapper from '@/components/TabSlideWrapper';

export default function StatisticsTab() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <TabSlideWrapper>
        <StatisticsScreen />
      </TabSlideWrapper>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ safe: { flex: 1 } });
