import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Switch, Alert, Modal, TextInput,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getSettings, saveSettings } from '@/services/database';
import { DEFAULT_CATEGORIES, CURRENCY_OPTIONS } from '@/services/constants';
import { Settings } from '@/types';
import AppInput from '@/components/AppInput';
import AppButton from '@/components/AppButton';

const EMOJI_OPTIONS = ['🍕','🚗','🏠','👗','🎮','📱','✈️','🎓','💊','🛒','☕','🎁','💡','🐾','⚽'];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [salary, setSalary] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [customEmojiMap, setCustomEmojiMap] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState('');
  const [newCatEmoji, setNewCatEmoji] = useState('📦');
  const [emojiPickTarget, setEmojiPickTarget] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getSettings().then((s) => {
      setSettings(s);
      setSalary(s.salary ? String(s.salary) : '');
      setCurrency(s.currency ?? 'EGP');
      setCustomCategories(s.customCategories ?? []);
      setCustomEmojiMap(s.customCategoryEmojis ?? {});
    });
  }, []);

  useFocusEffect(load);

  const saveAll = async () => {
    setSaving(true);
    const v = parseFloat(salary.replace(',', '.'));
    await saveSettings({
      salary: isNaN(v) ? 0 : v,
      currency,
      customCategories,
      customCategoryEmojis: customEmojiMap,
    });
    setSaving(false);
    router.back();
  };

  const addCategory = () => {
    const name = newCategory.trim();
    if (!name) return;
    if ([...DEFAULT_CATEGORIES, ...customCategories].includes(name)) {
      Alert.alert('Duplicate', 'This category already exists.');
      return;
    }
    setCustomCategories(prev => [...prev, name]);
    setCustomEmojiMap(prev => ({ ...prev, [name]: newCatEmoji }));
    setNewCategory('');
    setNewCatEmoji('📦');
  };

  const removeCategory = (cat: string) => {
    setCustomCategories(prev => prev.filter(c => c !== cat));
    setCustomEmojiMap(prev => { const n = { ...prev }; delete n[cat]; return n; });
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Salary */}
        <AppInput
          label="Monthly Salary"
          value={salary}
          onChangeText={setSalary}
          placeholder="Enter monthly salary"
          keyboardType="decimal-pad"
        />

        {/* Currency */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Currency</Text>
        <View style={styles.currencyRow}>
          {CURRENCY_OPTIONS.map(c => (
            <TouchableOpacity
              key={c}
              style={[
                styles.currencyPill,
                { backgroundColor: currency === c ? colors.primary : colors.inputFill,
                  borderColor: currency === c ? colors.primary : colors.border },
              ]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyText, { color: currency === c ? colors.background : colors.textPrimary }]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Dark mode */}
        <View style={[styles.row, { backgroundColor: colors.card }]}>
          <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>🌙 Dark Mode</Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>

        {/* Custom categories */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Custom Categories</Text>

        {customCategories.map(cat => (
          <View key={cat} style={[styles.catRow, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.catEmoji}
              onPress={() => setEmojiPickTarget(cat)}
            >
              <Text style={{ fontSize: 22 }}>{customEmojiMap[cat] ?? '📦'}</Text>
            </TouchableOpacity>
            <Text style={[styles.catName, { color: colors.textPrimary }]}>{cat}</Text>
            <TouchableOpacity onPress={() => removeCategory(cat)}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        ))}

        <View style={[styles.addRow, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            style={styles.emojiBtn}
            onPress={() => setEmojiPickTarget('__new__')}
          >
            <Text style={{ fontSize: 22 }}>{newCatEmoji}</Text>
          </TouchableOpacity>
          <TextInput
            style={[styles.addInput, { color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="New category name"
            placeholderTextColor={colors.textSecondary}
            value={newCategory}
            onChangeText={setNewCategory}
          />
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={addCategory}
          >
            <Ionicons name="add" size={20} color={colors.background} />
          </TouchableOpacity>
        </View>

        <AppButton label="Save Settings" onPress={saveAll} loading={saving} />
        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Emoji picker modal */}
      <Modal visible={!!emojiPickTarget} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.emojiModal, { backgroundColor: colors.card }]}>
            <Text style={[styles.emojiTitle, { color: colors.textPrimary }]}>Pick an emoji</Text>
            <View style={styles.emojiGrid}>
              {EMOJI_OPTIONS.map(em => (
                <TouchableOpacity
                  key={em}
                  style={styles.emojiOpt}
                  onPress={() => {
                    if (emojiPickTarget === '__new__') {
                      setNewCatEmoji(em);
                    } else if (emojiPickTarget) {
                      setCustomEmojiMap(prev => ({ ...prev, [emojiPickTarget]: em }));
                    }
                    setEmojiPickTarget(null);
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => setEmojiPickTarget(null)}>
              <Text style={[styles.cancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  sectionLabel: { fontSize: 13, fontWeight: '600', marginBottom: 10, marginTop: 6 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  currencyPill: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5,
  },
  currencyText: { fontSize: 14, fontWeight: '600' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, marginBottom: 20,
  },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 14, borderRadius: 12, marginBottom: 8,
  },
  catEmoji: { marginRight: 10 },
  catName: { flex: 1, fontSize: 15, fontWeight: '600' },
  addRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 12, borderRadius: 12, marginBottom: 20,
  },
  emojiBtn: { padding: 4, marginRight: 8 },
  addInput: {
    flex: 1, fontSize: 14, borderBottomWidth: 1, paddingVertical: 4, marginRight: 10,
  },
  addBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'flex-end' },
  emojiModal: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  emojiTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  emojiOpt: { padding: 8 },
  cancel: { textAlign: 'center', marginTop: 16, fontSize: 15 },
});
