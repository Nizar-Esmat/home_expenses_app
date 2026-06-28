import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  totalBorrowed: number;
  totalLent: number;
  currency: string;
  onPress: () => void;
}

function fmtAmt(amount: number, currency: string): string {
  const isWhole = amount % 1 === 0;
  return `${currency} ${amount.toLocaleString('en-US', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function LoansSummaryCard({ totalBorrowed, totalLent, currency, onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>🤝</Text>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Loans</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
      </View>

      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>You owe</Text>
          <Text style={[styles.amount, { color: totalBorrowed > 0 ? '#EF4444' : colors.textSecondary }]}>
            {fmtAmt(totalBorrowed, currency)}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Owed to you</Text>
          <Text style={[styles.amount, { color: totalLent > 0 ? '#10B981' : colors.textSecondary }]}>
            {fmtAmt(totalLent, currency)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  titleEmoji: { fontSize: 18 },
  title: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { flex: 1, alignItems: 'center' },
  label: { fontSize: 12, marginBottom: 4 },
  amount: { fontSize: 17, fontWeight: '700' },
  divider: { width: 1, height: 36, marginHorizontal: 8 },
});
