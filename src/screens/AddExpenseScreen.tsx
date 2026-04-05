import React, { useEffect, useState } from 'react';
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

  const validate = () => {
    const v = parseFloat(price.replace(',', '.'));
    if (!price.trim()) {
      setPriceError('Please enter an amount');
      return false;
    }
    if (isNaN(v) || v <= 0) {
      setPriceError('Enter a valid amount greater than 0');
      return false;
    }
    setPriceError('');
    return true;
  };

  const save = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const v = parseFloat(price.replace(',', '.'));
      const catName = selectedCategory?.name ?? 'Other';
      const createdAt = date.toISOString();
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
          onChangeText={setPrice}
          placeholder='0.00'
          keyboardType='decimal-pad'
          error={priceError}
        />

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

        {editExpense ? null : <DateTimeInput date={date} onChange={setDate} />}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
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
