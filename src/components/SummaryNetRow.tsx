import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  label: string;
  amount: string;
  color: string;
}

export default function SummaryNetRow({ label, amount, color }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.amount, { color }]}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginHorizontal: 4,
    height: 70,
    gap: 6,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: '700',
  },
});
