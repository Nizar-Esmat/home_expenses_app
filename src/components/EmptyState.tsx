import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
    <View style={styles.container}>
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.cta, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={styles.ctaText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 20 },
  emoji: { fontSize: 40, marginBottom: 12 },
  message: { fontSize: 14, fontWeight: '500', textAlign: 'center', lineHeight: 20 },
  cta: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  ctaText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});