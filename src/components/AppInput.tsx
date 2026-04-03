import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export default function AppInput({ label, error, style, ...rest }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: colors.inputFill,
            color: colors.textPrimary,
            borderColor: error ? colors.danger : colors.border,
          },
          style,
        ]}
        placeholderTextColor={colors.textSecondary}
        {...rest}
      />
      {error ? <Text style={[styles.err, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  err: { fontSize: 12, marginTop: 4 },
});
