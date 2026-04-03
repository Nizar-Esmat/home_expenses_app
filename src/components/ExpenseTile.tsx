import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Expense } from '@/types';
import { formatCurrency, formatDate } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  expense: Expense;
  currency: string;
  categoryEmoji: string;
  categoryColor: string;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ExpenseTile({
  expense, currency, categoryEmoji, categoryColor, onEdit, onDelete,
}: Props) {
  const { colors } = useTheme();

  const confirmDelete = () =>
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Colored category badge */}
      <View style={[styles.badge, { backgroundColor: categoryColor }]}>
        <Text style={styles.emoji}>{categoryEmoji}</Text>
      </View>

      <View style={styles.info}>
        <Text style={[styles.category, { color: colors.textPrimary }]}>{expense.category}</Text>
        {expense.note ? (
          <Text style={[styles.note, { color: colors.textSecondary }]} numberOfLines={1}>
            {expense.note}
          </Text>
        ) : null}
        <Text style={[styles.date, { color: colors.textSecondary }]}>{formatDate(expense.createdAt)}</Text>
      </View>

      <Text style={[styles.price, { color: colors.danger }]}>
        -{formatCurrency(expense.price, currency)}
      </Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onEdit} style={styles.action} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={confirmDelete} style={styles.action} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="trash-outline" size={18} color={colors.danger} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  badge: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  emoji: { fontSize: 22 },
  info: { flex: 1 },
  category: { fontSize: 15, fontWeight: '600' },
  note: { fontSize: 13, marginTop: 2 },
  date: { fontSize: 12, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', marginRight: 8 },
  actions: { flexDirection: 'row' },
  action: { padding: 4, marginLeft: 4 },
});
