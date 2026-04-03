import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { addExpense, updateExpense, getSettings, getExpensesByMonth } from '@/services/database';
import { DEFAULT_CATEGORIES, CATEGORY_EMOJIS, currentMonthKey } from '@/services/constants';
import { Expense, Settings } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [priceError, setPriceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    const init = async () => {
      const sets = await getSettings();
      setSettings(sets);

      if (expenseId) {
        const monthKey = currentMonthKey();
        const expenses = await getExpensesByMonth(monthKey);
        const found = expenses.find(e => String(e.id) === expenseId);
        if (found) {
          setEditExpense(found);
          setPrice(String(found.price));
          setCategory(found.category);
          setNote(found.note ?? '');
        }
      }
    };
    init();
  }, [expenseId]);

  const allCategories = [...DEFAULT_CATEGORIES, ...(settings?.customCategories ?? [])];

  const getEmoji = (cat: string) =>
    CATEGORY_EMOJIS[cat] ?? settings?.customCategoryEmojis?.[cat] ?? '📦';

  const validate = () => {
    const v = parseFloat(price.replace(',', '.'));
    if (!price.trim()) { setPriceError('Please enter an amount'); return false; }
    if (isNaN(v) || v <= 0) { setPriceError('Enter a valid amount greater than 0'); return false; }
    setPriceError('');
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const v = parseFloat(price.replace(',', '.'));
      if (editExpense) {
        await updateExpense(editExpense.id, v, category, note.trim() || null);
      } else {
        await addExpense(v, category, note.trim() || null);
      }
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to save expense. Please try again.');
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
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {editExpense ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppInput
          label="Amount"
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          keyboardType="decimal-pad"
          error={priceError}
        />

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Category</Text>
        <View style={styles.categoryGrid}>
          {allCategories.map((cat) => {
            const selected = cat === category;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected ? colors.primary : colors.inputFill,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.pillEmoji}>{getEmoji(cat)}</Text>
                <Text style={[styles.pillLabel, { color: selected ? colors.background : colors.textPrimary }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppInput
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          placeholder="What was this for?"
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />

        <AppButton
          label={editExpense ? 'Update Expense' : 'Save Expense'}
          onPress={save}
          loading={loading}
        />
      </ScrollView>
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
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryPill: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1.5,
  },
  pillEmoji: { fontSize: 16, marginRight: 6 },
  pillLabel: { fontSize: 14, fontWeight: '600' },
});
