import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  monthLabel?: string;
}

export default function EmptyStatisticsState({ monthLabel = 'this period' }: Props) {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📊</Text>
      <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">
        No statistics for {monthLabel} yet
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Add transactions to see spending insights and category breakdowns.
      </Text>

      <TouchableOpacity
        style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
        onPress={() => router.push('/add-expense')}
        accessibilityRole="button"
        accessibilityLabel="Log an expense"
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={18} color={colors.onPrimary} />
        <Text style={[styles.ctaText, { color: colors.onPrimary }]}>
          Log an Expense
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
