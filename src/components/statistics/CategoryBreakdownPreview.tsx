import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { SpendingCategoryItem } from '@/services/reportUtils';
import CategoryStatRow from './CategoryStatRow';

interface Props {
  data: SpendingCategoryItem[];
  currency: string;
  onViewAll?: () => void;
}

export default function CategoryBreakdownPreview({ data, currency, onViewAll }: Props) {
  const { colors } = useTheme();
  if (data.length === 0) return null;

  const top5 = data.slice(0, 5);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.title}>Spending by Category</Text>
        {data.length > 5 && onViewAll && (
          <TouchableOpacity style={styles.viewAllBtn} onPress={onViewAll} activeOpacity={0.7}>
            <Text style={[styles.viewAllText, { color: colors.primary }]}>View all</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      {top5.map((item, index) => (
        <CategoryStatRow
          key={item.category}
          category={item.category}
          total={item.total}
          percentage={item.percentage}
          categoryEmoji={item.categoryEmoji}
          categoryColor={item.categoryColor}
          currency={currency}
          isLast={index === top5.length - 1}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
