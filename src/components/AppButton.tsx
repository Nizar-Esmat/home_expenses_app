import React from 'react';
import {
  TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'danger';
  style?: ViewStyle;
}

export default function AppButton({
  label,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  style,
}: Props) {
  const { colors } = useTheme();

  const bg =
    variant === 'danger' ? colors.dangerBg :
    variant === 'outline' ? 'transparent' :
    colors.primary;

  const border =
    variant === 'danger' ? colors.danger :
    variant === 'outline' ? colors.primary :
    colors.primary;

  const textColor =
    variant === 'danger' ? colors.danger :
    variant === 'outline' ? colors.primary :
    colors.onPrimary;

  const isInteractive = !disabled && !loading;

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          opacity: isInteractive ? 1 : 0.45,
        },
        style,
      ]}
      onPress={onPress}
      disabled={!isInteractive}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !isInteractive, busy: !!loading }}
    >
      {loading ? (
        <ActivityIndicator color={textColor} size="small" />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    minHeight: 48,
  },
  label: { fontSize: 16, fontWeight: '700' },
});
