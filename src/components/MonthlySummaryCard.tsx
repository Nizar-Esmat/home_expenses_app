import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  income: string;
  spent: string;
  net: string;
  currency?: string;
}

export default function MonthlySummaryCard({
  income,
  spent,
  net,
  currency = 'EGP',
}: Props) {
  const { colors } = useTheme();

  const parseAmount = (val: string): number => {
    const clean = val.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const incomeNum = parseAmount(income);
  const spentNum = parseAmount(spent);
  const netNum = parseAmount(net);

  const isNetPositive = netNum > 0;
  const isNetNegative = netNum < 0;

  const netColor = isNetPositive
    ? colors.success
    : isNetNegative
      ? colors.danger
      : colors.textPrimary;

  const netText = `${isNetPositive ? '+' : ''}${currency} ${Math.abs(
    netNum,
  ).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const incomeText = `${currency} ${Math.abs(incomeNum).toLocaleString(
    'en-US',
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;

  const spentText = `${currency} ${Math.abs(spentNum).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={`Monthly summary: Net savings ${netText}, Income ${incomeText}, Spent ${spentText}`}
    >
      {/* Top section - Net savings */}
      <View style={styles.netSection}>
        <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net savings</Text>
        <Text style={[styles.netAmount, { color: netColor }]} accessibilityRole="header">
          {netText}
        </Text>
      </View>

      {/* Horizontal divider */}
      <View style={[styles.horizontalDivider, { backgroundColor: colors.border }]} />

      {/* Bottom section - Income & Spent */}
      <View style={styles.bottomSection}>
        <View style={styles.bottomRow}>
          {/* Left column - Income */}
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Income</Text>
            <Text style={[styles.columnValue, { color: colors.success }]}>
              {incomeText}
            </Text>
          </View>

          {/* Vertical divider */}
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />

          {/* Right column - Spent */}
          <View style={styles.column}>
            <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Spent</Text>
            <Text style={[styles.columnValue, { color: colors.danger }]}>
              {spentText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  netSection: {
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  horizontalDivider: {
    height: 1,
    marginVertical: 12,
  },
  bottomSection: {
    // Container for the two columns
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  columnValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
});
