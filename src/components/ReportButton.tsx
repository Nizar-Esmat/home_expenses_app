import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  onPress: () => void;
}

export default function ReportButton({ onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}> View Full Report</Text>
      <Ionicons name='chevron-forward' size={16} color='#9CA3AF' />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 6,
    gap: 4,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
