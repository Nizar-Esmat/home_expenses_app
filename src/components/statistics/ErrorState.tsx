import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  onRetry: () => void;
}

export default function ErrorState({ onRetry }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Couldn&apos;t load statistics</Text>
      <TouchableOpacity
        style={[styles.retryBtn, { backgroundColor: colors.primary }]}
        onPress={onRetry}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Retry loading statistics"
      >
        <Ionicons name="refresh" size={18} color={colors.onPrimary} />
        <Text style={[styles.retryText, { color: colors.onPrimary }]}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 4,
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
