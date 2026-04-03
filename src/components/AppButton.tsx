import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
}

export default function AppButton({ label, onPress, loading, disabled, variant = 'primary', style }: Props) {
  const { colors } = useTheme();

  const bg =
    variant === 'danger' ? 'transparent' :
    variant === 'outline' ? 'transparent' :
    colors.primary;

  const border =
    variant === 'danger' ? colors.danger :
    variant === 'outline' ? colors.primary :
    colors.primary;

  const textColor =
    variant === 'danger' ? colors.danger :
    variant === 'outline' ? colors.primary :
    colors.background;

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: bg, borderColor: border }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
    >
      {loading
        ? <ActivityIndicator color={textColor} size="small" />
        : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  label: { fontSize: 16, fontWeight: '600' },
});
