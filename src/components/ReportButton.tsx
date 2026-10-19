import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  onPress: () => void;
}

export default function ReportButton({ onPress }: Props) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessibilityRole="button"
      accessibilityLabel="View statistics"
    >
      <Text style={[styles.text, { color: colors.primary }]}>View statistics</Text>
      <Ionicons name='chevron-forward' size={16} color={colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minHeight: 44,
    gap: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
