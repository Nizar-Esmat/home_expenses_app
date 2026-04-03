import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/ThemeContext';
import CategoryManagerScreen from '@/screens/CategoryManagerScreen';

export default function CategoriesPage() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <CategoryManagerScreen />
    </SafeAreaView>
  );
}
