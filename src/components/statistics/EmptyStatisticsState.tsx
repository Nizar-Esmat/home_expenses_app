import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  monthLabel: string;
}

export default function EmptyStatisticsState({ monthLabel }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>📊</Text>
      <Text style={styles.title}>No statistics for this period yet</Text>
      <Text style={styles.subtitle}>
        Add transactions to see spending insights.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#AAB2C0',
    textAlign: 'center',
    lineHeight: 20,
  },
});
