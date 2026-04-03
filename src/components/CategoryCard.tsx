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
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      {/* Colored emoji badge */}
      <View style={[styles.badge, { backgroundColor: category.color }]}>
        <Text style={styles.badgeEmoji}>{category.emoji}</Text>
      </View>

      {/* Name + meta */}
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

      {/* Lock badge for built-in */}
      {isBuiltIn && (
        <View style={[styles.lockBadge, { backgroundColor: colors.inputFill }]}>
          <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          <Text style={[styles.lockText, { color: colors.textSecondary }]}>Built-in</Text>
        </View>
      )}

      {/* Actions */}
      <TouchableOpacity
        onPress={onEdit}
        style={[styles.actionBtn, { backgroundColor: colors.inputFill }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
      </TouchableOpacity>

      {!isBuiltIn && (
        <TouchableOpacity
          onPress={onDelete}
          style={[styles.actionBtn, { backgroundColor: colors.dangerBg, marginLeft: 6 }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
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
    padding: 14,
    marginBottom: 10,
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
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
