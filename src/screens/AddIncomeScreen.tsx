import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { addIncome, getSettings } from '@/services/database';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';

export default function AddIncomeScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [amountError, setAmountError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const v = parseFloat(amount.replace(',', '.'));
    if (!amount.trim()) { setAmountError('Please enter an amount'); return false; }
    if (isNaN(v) || v <= 0) { setAmountError('Enter a valid amount greater than 0'); return false; }
    setAmountError('');
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const v = parseFloat(amount.replace(',', '.'));
      await addIncome(v, note.trim() || null);
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save income. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Add Income</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        {/* Icon banner */}
        <View style={[styles.banner, { backgroundColor: colors.successBg }]}>
          <Text style={styles.bannerEmoji}>💰</Text>
          <Text style={[styles.bannerText, { color: colors.success }]}>
            Record money you received today
          </Text>
        </View>

        <AppInput
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={amountError}
        />

        <AppInput
          label="Source / Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="e.g. Salary, Freelance, Bonus…"
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />

        <AppButton label="Save Income" onPress={save} loading={loading} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  banner: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 14, marginBottom: 24,
  },
  bannerEmoji: { fontSize: 24, marginRight: 12 },
  bannerText: { fontSize: 14, fontWeight: '600', flex: 1 },
});
