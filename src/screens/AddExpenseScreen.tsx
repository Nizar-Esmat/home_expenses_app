import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  addExpense,
  updateExpense,
  getCategories,
  getExpensesByMonth,
} from '@/services/database';
import { currentMonthKey } from '@/services/constants';
import { parseExpression } from '@/services/mathParser';
import { Category, Expense } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';
import DateTimeInput from '@/components/DateTimeInput';

export default function AddExpenseScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { expenseId } = useLocalSearchParams<{ expenseId?: string }>();

  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [price, setPrice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date());
  const [useCustomDate, setUseCustomDate] = useState(false);
  const [priceError, setPriceError] = useState('');
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const init = async () => {
      const cats = await getCategories();
      setCategories(cats);

      if (expenseId) {
        const expenses = await getExpensesByMonth(currentMonthKey());
        const found = expenses.find((e) => String(e.id) === expenseId);
        if (found) {
          setEditExpense(found);
          setPrice(String(found.price));
          setNote(found.note ?? '');
          setDate(new Date(found.createdAt));
          const cat = cats.find((c) => c.name === found.category);
          setSelectedCategory(cat ?? cats[0] ?? null);
          return;
        }
      }

      setSelectedCategory(cats[0] ?? null);
    };
    init();
  }, [expenseId]);

  // Whether the user typed an arithmetic expression (not a plain number)
  const isExpression = /[+\-*/]/.test(price);

  // Live parse result — recomputed on every keystroke
  const calcResult = useMemo(
    () => (price.trim() ? parseExpression(price) : null),
    [price],
  );

  const validate = (): number | null => {
    if (!price.trim()) {
      setPriceError('Please enter an amount');
      return null;
    }
    const result = parseExpression(price);
    if (!result.ok) {
      // Expression errors are already shown in the live preview;
      // only surface them in the field error for plain-number mistakes.
      if (!isExpression) setPriceError(result.error || 'Enter a valid amount greater than 0');
      return null;
    }
    setPriceError('');
    return result.value;
  };

  const save = async () => {
    const v = validate();
    if (v === null) return;
    setLoading(true);
    try {
      const catName = selectedCategory?.name ?? 'Other';
      const createdAt = useCustomDate ? date.toISOString() : new Date().toISOString();
      if (editExpense) {
        await updateExpense(editExpense.id, v, catName, note.trim() || null);
      } else {
        await addExpense(v, catName, note.trim() || null, createdAt);
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
          <Ionicons name='arrow-back' size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {editExpense ? 'Edit Expense' : 'Add Expense'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <AppInput
          label='Amount'
          value={price}
          onChangeText={(text) => {
            setPrice(text);
            if (priceError) setPriceError('');
          }}
          placeholder='0.00'
          keyboardType='default'
          error={priceError}
          autoCorrect={false}
          autoCapitalize='none'
        />

        {isExpression && calcResult && (
          <View style={styles.calcRow}>
            {calcResult.ok ? (
              <Text style={[styles.calcValue, { color: colors.primary }]}>
                = {calcResult.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </Text>
            ) : calcResult.error ? (
              <Text style={[styles.calcError, { color: colors.danger }]}>
                ⚠ {calcResult.error}
              </Text>
            ) : null}
          </View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
          CATEGORY
        </Text>
        <View style={styles.categoryGrid}>
          {categories.map((cat) => {
            const selected = selectedCategory?.id === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: selected ? cat.color : colors.inputFill,
                    borderColor: selected ? cat.color : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={styles.pillEmoji}>{cat.emoji}</Text>
                <Text
                  style={[
                    styles.pillLabel,
                    { color: selected ? '#fff' : colors.textPrimary },
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <AppInput
          label='Note (optional)'
          value={note}
          onChangeText={setNote}
          placeholder='What was this for?'
          multiline
          numberOfLines={3}
          style={{ height: 80, paddingTop: 12, textAlignVertical: 'top' }}
        />

        {editExpense ? null : <DateTimeInput date={date} onChange={setDate} useCustomDate={useCustomDate} onUseCustomDateChange={setUseCustomDate} />}

        <AppButton
          label={editExpense ? 'Update Expense' : 'Save Expense'}
          onPress={save}
          loading={loading}
          disabled={isExpression && calcResult !== null && !calcResult.ok}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  calcRow: {
    marginTop: -10,
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  calcValue: { fontSize: 15, fontWeight: '700' },
  calcError: { fontSize: 13, fontWeight: '500' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pillEmoji: { fontSize: 16, marginRight: 6 },
  pillLabel: { fontSize: 14, fontWeight: '600' },
});
