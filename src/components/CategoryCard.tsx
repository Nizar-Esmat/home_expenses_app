import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Category } from '@/types';

interface Props {
  category: Category;
  expenseCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CategoryCard({ category, expenseCount, onEdit, onDelete }: Props) {
  const { colors } = useTheme();
  const isBuiltIn = category.isDefault === 1;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={onEdit}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={`Edit category ${category.name}, ${expenseCount} expenses`}
      >
        <View style={[styles.badge, { backgroundColor: category.color }]}>
          <Text style={styles.badgeEmoji}>{category.emoji}</Text>
        </View>

        <View style={styles.info}>
          <Text style={[styles.name, { color: colors.textPrimary, textAlign: 'auto' }]} numberOfLines={1}>
            {category.name}
          </Text>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {expenseCount > 0
                ? `${expenseCount} expense${expenseCount > 1 ? 's' : ''}`
                : 'No expenses yet'}
            </Text>
            {category.budgetLimit != null && category.budgetLimit > 0 && (
              <View style={[styles.budgetBadge, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="pie-chart-outline" size={10} color={colors.primary} />
                <Text style={[styles.budgetText, { color: colors.primary }]}>
                  {category.budgetLimit.toLocaleString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {isBuiltIn && (
          <View style={[styles.lockBadge, { backgroundColor: colors.inputFill }]}>
            <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
            <Text style={[styles.lockText, { color: colors.textSecondary }]}>Built-in</Text>
          </View>
        )}

        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginRight: 4 }} />
      </TouchableOpacity>

      {!isBuiltIn && (
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={`Delete category ${category.name}`}
        >
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 8,
    paddingLeft: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeEmoji: { fontSize: 22 },
  info: { flex: 1, marginRight: 8 },
  name: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  meta: { fontSize: 12 },
  budgetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  budgetText: { fontSize: 10, fontWeight: '700' },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    gap: 3,
  },
  lockText: { fontSize: 10, fontWeight: '600' },
  deleteBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
