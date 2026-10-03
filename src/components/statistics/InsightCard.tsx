import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  icon: string;
  label: string;
  value: string;
}

export default function InsightCard({ icon, label, value }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { borderColor: colors.border }]}>
      <Text style={[styles.icon, { color: colors.textPrimary }]}>{icon}</Text>
      <Text style={[styles.value]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 0.5,
    borderRadius: 12,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: '50%',
  },
  icon: {
    fontSize: 18,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    color: '#F8FAFC',
    fontWeight: '500',
    textAlign: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 2,
  },
});
