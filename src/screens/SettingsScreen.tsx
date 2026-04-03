import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Alert, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getSettings, saveSettings } from '@/services/database';
import {
  DEFAULT_CATEGORIES, CATEGORY_EMOJIS, CUSTOM_EMOJI_OPTIONS,
} from '@/services/constants';
import { Settings } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const navigation = useNavigation<any>();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [salary, setSalary] = useState('');
  const [salaryError, setSalaryError] = useState('');
  const [saving, setSaving] = useState(false);
  const [newCat, setNewCat] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(CUSTOM_EMOJI_OPTIONS[0]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  useEffect(() => {
    getSettings().then((s) => {
      setSettings(s);
      if (s.salary > 0) setSalary(s.salary.toFixed(2));
    });
  }, []);

  const saveSalary = async () => {
    const v = parseFloat(salary.replace(',', '.'));
    if (!salary.trim() || isNaN(v) || v < 0) {
      setSalaryError('Please enter a valid positive amount');
      return;
    }
    setSalaryError('');
    setSaving(true);
    await saveSettings({ salary: v, currency: settings?.currency ?? 'EGP' });
    setSaving(false);
    Alert.alert('Saved', 'Settings saved successfully ✓');
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) {
      Alert.alert('Error', 'Category name cannot be empty.');
      return;
    }
    const all = [...DEFAULT_CATEGORIES, ...(settings?.customCategories ?? [])];
    if (all.some((c) => c.toLowerCase() === name.toLowerCase())) {
      Alert.alert('Error', 'This category already exists.');
      return;
    }
    const updated = [...(settings?.customCategories ?? []), name];
    const updatedEmojis = { ...(settings?.customCategoryEmojis ?? {}), [name]: selectedEmoji };
    await saveSettings({ customCategories: updated, customCategoryEmojis: updatedEmojis });
    setSettings((s) => s ? { ...s, customCategories: updated, customCategoryEmojis: updatedEmojis } : s);
    setNewCat('');
    setSelectedEmoji(CUSTOM_EMOJI_OPTIONS[0]);
    setShowEmojiPicker(false);
  };

  const deleteCategory = async (cat: string) => {
    const updated = (settings?.customCategories ?? []).filter((c) => c !== cat);
    const updatedEmojis = { ...(settings?.customCategoryEmojis ?? {}) };
    delete updatedEmojis[cat];
    await saveSettings({ customCategories: updated, customCategoryEmojis: updatedEmojis });
    setSettings((s) => s ? { ...s, customCategories: updated, customCategoryEmojis: updatedEmojis } : s);
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>⚙️ Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Appearance ───────────── */}
        <Text style={[styles.section, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.highlight}
          />
        </View>

        {/* ── Budget ───────────────── */}
        <Text style={[styles.section, { color: colors.textPrimary }]}>Budget</Text>
        <AppInput
          label={`Monthly Salary (${settings?.currency ?? 'EGP'})`}
          value={salary}
          onChangeText={setSalary}
          placeholder="e.g. 5000.00"
          keyboardType="decimal-pad"
          error={salaryError}
        />
        <AppButton label="Save Salary" onPress={saveSalary} loading={saving} style={styles.saveBtn} />

        {/* ── Categories ───────────── */}
        <Text style={[styles.section, { color: colors.textPrimary }]}>Expense Categories</Text>

        {/* Default categories */}
        <View style={styles.chips}>
          {DEFAULT_CATEGORIES.map((cat) => (
            <View key={cat} style={[styles.chip, { backgroundColor: colors.inputFill, borderColor: colors.border }]}>
              <Text>{CATEGORY_EMOJIS[cat]}  {cat}</Text>
            </View>
          ))}
        </View>

        {/* Custom categories */}
        {(settings?.customCategories ?? []).length > 0 && (
          <>
            <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Your Categories</Text>
            <View style={styles.chips}>
              {(settings?.customCategories ?? []).map((cat) => {
                const emoji = settings?.customCategoryEmojis?.[cat] ?? '📦';
                return (
                  <View key={cat} style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
                    <Text style={{ color: colors.textPrimary }}>{emoji}  {cat}</Text>
                    <TouchableOpacity onPress={() => deleteCategory(cat)} style={styles.deleteChip}>
                      <Ionicons name="close" size={14} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Add new category */}
        <View style={[styles.addRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Emoji selector button */}
          <TouchableOpacity
            style={[styles.emojiBtn, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
            onPress={() => setShowEmojiPicker((p) => !p)}
          >
            <Text style={styles.emojiPreview}>{selectedEmoji}</Text>
          </TouchableOpacity>

          <TextInput
            style={[styles.catInput, { backgroundColor: colors.inputFill, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="New category name…"
            placeholderTextColor={colors.textSecondary}
            value={newCat}
            onChangeText={setNewCat}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={addCategory}
          >
            <Ionicons name="add" size={22} color={colors.background} />
          </TouchableOpacity>
        </View>

        {/* Emoji picker grid */}
        {showEmojiPicker && (
          <View style={[styles.emojiGrid, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {CUSTOM_EMOJI_OPTIONS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[
                  styles.emojiOption,
                  selectedEmoji === e && { backgroundColor: colors.primary + '33' },
                ]}
                onPress={() => { setSelectedEmoji(e); setShowEmojiPicker(false); }}
              >
                <Text style={styles.emojiOptionText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
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
  section: { fontSize: 17, fontWeight: '700', marginBottom: 14, marginTop: 8 },
  subLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  saveBtn: { marginBottom: 24 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 20, gap: 12,
  },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, gap: 4,
  },
  deleteChip: { marginLeft: 6 },
  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 10, borderRadius: 12, borderWidth: 1, marginBottom: 8,
  },
  emojiBtn: {
    width: 44, height: 44, borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiPreview: { fontSize: 22 },
  catInput: {
    flex: 1, height: 44, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, fontSize: 14,
  },
  addBtn: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12,
  },
  emojiOption: {
    width: 44, height: 44, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  emojiOptionText: { fontSize: 24 },
});
