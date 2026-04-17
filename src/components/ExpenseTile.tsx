import React, { useState } from 'react';
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
  const [expanded, setExpanded] = useState(false);
  const subs = expense.subExpenses ?? [];

  const confirmDelete = () =>
    Alert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>

      {/* ── Main row ──────────────────────────────────────── */}
      <View style={styles.mainRow}>
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

      {/* ── Sub-expenses ──────────────────────────────────── */}
      {subs.length > 0 && (
        <View style={[styles.subSection, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={styles.subToggle}
            onPress={() => setExpanded((e) => !e)}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={13}
              color={colors.textSecondary}
            />
            <Text style={[styles.subToggleText, { color: colors.textSecondary }]}>
              {subs.length} item{subs.length !== 1 ? 's' : ''}
            </Text>
          </TouchableOpacity>

          {expanded && subs.map((sub, i) => (
            <View key={i} style={styles.subRow}>
              <Text
                style={[styles.subTitle, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {sub.title}
              </Text>
              <Text style={[styles.subAmount, { color: colors.danger }]}>
                -{formatCurrency(sub.amount, currency)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden',
  },
  mainRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
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
  subSection: {
    borderTopWidth: 1, paddingHorizontal: 14, paddingBottom: 10, paddingTop: 8,
  },
  subToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginBottom: 2,
  },
  subToggleText: { fontSize: 12, fontWeight: '600' },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingVertical: 4, paddingLeft: 17,
  },
  subTitle: { flex: 1, fontSize: 13, marginRight: 8 },
  subAmount: { fontSize: 13, fontWeight: '600' },
});
