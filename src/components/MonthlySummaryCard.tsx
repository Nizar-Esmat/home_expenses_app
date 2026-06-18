import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  const parseAmount = (val: string): number => {
    const clean = val.replace(/[^0-9.-]/g, '');
    return parseFloat(clean) || 0;
  };

  const incomeNum = parseAmount(income);
  const spentNum = parseAmount(spent);
  const netNum = parseAmount(net);

  const isNetPositive = netNum > 0;
  const isNetNegative = netNum < 0;

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
    <View style={styles.card}>
      {/* Top section - Net savings */}
      <View style={styles.netSection}>
        <Text style={styles.netLabel}>Net savings</Text>
        <Text
          style={[
            styles.netAmount,
            {
              color: isNetPositive
                ? '#4ade80'
                : isNetNegative
                  ? '#f87171'
                  : '#F8FAFC',
            },
          ]}
        >
          {netText}
        </Text>
      </View>

      {/* Horizontal divider */}
      <View style={styles.horizontalDivider} />

      {/* Bottom section - Income & Spent */}
      <View style={styles.bottomSection}>
        <View style={styles.bottomRow}>
          {/* Left column - Income */}
          <View style={styles.column}>
            <Text style={styles.columnLabel}>Income</Text>
            <Text style={[styles.columnValue, { color: '#4ade80' }]}>
              {incomeText}
            </Text>
          </View>

          {/* Vertical divider */}
          <View style={styles.verticalDivider} />

          {/* Right column - Spent */}
          <View style={styles.column}>
            <Text style={styles.columnLabel}>Spent</Text>
            <Text style={[styles.columnValue, { color: '#f87171' }]}>
              {spentText}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const MUTED_TEXT = '#8a8f9d';
const DIVIDER_COLOR = '#2e3350';

const styles = StyleSheet.create({
  card: {
    borderWidth: 0.5,
    borderColor: DIVIDER_COLOR,
    borderRadius: 16,
    padding: 16,
  },
  netSection: {
    alignItems: 'center',
  },
  netLabel: {
    fontSize: 12,
    color: MUTED_TEXT,
    marginBottom: 4,
  },
  netAmount: {
    fontSize: 32,
    fontWeight: '800',
  },
  horizontalDivider: {
    height: 0.5,
    backgroundColor: DIVIDER_COLOR,
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
    fontSize: 11,
    color: MUTED_TEXT,
    marginBottom: 2,
  },
  columnValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  verticalDivider: {
    width: 0.5,
    backgroundColor: DIVIDER_COLOR,
    alignSelf: 'stretch',
    marginHorizontal: 8,
  },
});
