import React from 'react';
import { View, StyleSheet } from 'react-native';
import { formatCurrency, formatCurrencyCompact } from '@/services/constants';
import InsightCard from './InsightCard';

interface Props {
  transactionCount: number;
  averageExpense: number;
  topCategory: string | null;
  biggestExpense: number;
  currency: string;
}

function smartFormat(amount: number, currency: string): string {
  const full = formatCurrency(amount, currency);
  if (full.length > 14) {
    return formatCurrencyCompact(amount, currency);
  }
  return full;
}

export default function QuickInsightsGrid({
  transactionCount,
  averageExpense,
  topCategory,
  biggestExpense,
  currency,
}: Props) {
  const avgFormatted = smartFormat(averageExpense, currency);
  const biggestFormatted = smartFormat(biggestExpense, currency);

  return (
    <View style={styles.grid}>
      <View style={styles.row}>
        <InsightCard
          icon='📊'
          label='Transactions'
          value={`${transactionCount}`}
        />
        <InsightCard icon='💰' label='Avg Expense' value={avgFormatted} />
      </View>
      <View style={styles.row}>
        <InsightCard
          icon='🏆'
          label='Top Category'
          value={topCategory ?? '—'}
        />
        <InsightCard
          icon='🔥'
          label='Biggest Expense'
          value={biggestFormatted}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    marginVertical: 20,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
});
