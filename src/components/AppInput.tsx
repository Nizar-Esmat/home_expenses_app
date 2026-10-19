import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function AppInput({
  label,
  error,
  style,
  textAlign,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputFill,
            color: colors.textPrimary,
            borderColor: error
              ? colors.danger
              : isFocused
                ? colors.primary
                : colors.border,
            textAlign: textAlign ?? 'auto',
            writingDirection: 'auto',
          },
          rest.multiline && { textAlignVertical: 'top' },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        accessibilityLabel={rest.accessibilityLabel || label}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
      {error ? (
        <Text style={[styles.err, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    minHeight: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  err: { fontSize: 12, marginTop: 4 },
});
