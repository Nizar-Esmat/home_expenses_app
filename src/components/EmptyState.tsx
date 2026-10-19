import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  emoji?: string;
}

export default function EmptyState({ message, actionLabel, onAction, emoji }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessible={true}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity
          style={[styles.cta, { backgroundColor: colors.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.ctaText, { color: colors.onPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emoji: { fontSize: 40, marginBottom: 12 },
  message: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  cta: {
    marginTop: 16,
    minHeight: 44,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 15, fontWeight: '700' },
});