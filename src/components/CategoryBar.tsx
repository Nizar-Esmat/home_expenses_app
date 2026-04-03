import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CATEGORY_EMOJIS, formatCurrency } from '../services/constants';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  category: string;
  total: number;
  currency: string;
  percentage: number; // 0–1
  customEmojiMap: Record<string, string>;
}

export default function CategoryBar({ category, total, currency, percentage, customEmojiMap }: Props) {
  const { colors } = useTheme();
  const emoji = CATEGORY_EMOJIS[category] ?? customEmojiMap[category] ?? '📦';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.inputFill }]}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <Text style={[styles.name, { color: colors.textPrimary }]}>{category}</Text>
        <View style={styles.right}>
          <Text style={[styles.total, { color: colors.textPrimary }]}>
            {formatCurrency(total, currency)}
          </Text>
          <Text style={[styles.pct, { color: colors.textSecondary }]}>
            {(percentage * 100).toFixed(1)}%
          </Text>
        </View>
      </View>
      <View style={[styles.track, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.fill,
            { width: `${Math.min(percentage * 100, 100)}%`, backgroundColor: colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  emoji: { fontSize: 20 },
  name: { flex: 1, fontSize: 15, fontWeight: '600' },
  right: { alignItems: 'flex-end' },
  total: { fontSize: 15, fontWeight: '700' },
  pct: { fontSize: 12 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});
