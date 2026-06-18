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
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onEdit}
      activeOpacity={0.6}
    >
      <View style={[styles.badge, { backgroundColor: category.color }]}>
        <Text style={styles.badgeEmoji}>{category.emoji}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {category.name}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          {expenseCount > 0
            ? `${expenseCount} expense${expenseCount > 1 ? 's' : ''}`
            : 'No expenses yet'}
        </Text>
      </View>

      {isBuiltIn && (
        <View style={[styles.lockBadge, { backgroundColor: colors.inputFill }]}>
          <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          <Text style={[styles.lockText, { color: colors.textSecondary }]}>Built-in</Text>
        </View>
      )}

      {!isBuiltIn && (
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Ionicons name="trash-outline" size={15} color={colors.danger} />
        </TouchableOpacity>
      )}

      <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
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
  meta: { fontSize: 12 },
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
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
});
