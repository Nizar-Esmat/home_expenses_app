import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  icon: string;
  title: string;
  value: string;
  valueColor?: string;
  flex?: boolean;
}

export default function SummaryCard({ icon, title, value, valueColor, flex }: Props) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border },
        flex && { flex: 1 },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
      <Text style={[styles.value, { color: valueColor ?? colors.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16, borderRadius: 14, borderWidth: 1,
    alignItems: 'center', margin: 4,
  },
  icon: { fontSize: 24, marginBottom: 6 },
  title: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700' },
});
