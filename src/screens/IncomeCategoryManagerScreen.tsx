import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getIncomeCategories, addIncomeCategory, updateIncomeCategory, deleteIncomeCategory,
} from '@/services/database';
import { EMOJI_GROUPS, INCOME_CATEGORY_COLORS } from '@/services/constants';
import { IncomeCategory } from '@/types';
import IncomeCategoryCard from '@/components/IncomeCategoryCard';

interface FormState {
  mode: 'add' | 'edit';
  target: IncomeCategory | null;
  name: string;
  emoji: string;
  color: string;
  emojiGroup: number;
  saving: boolean;
  nameError: string;
}

const INITIAL_FORM: FormState = {
  mode: 'add',
  target: null,
  name: '',
  emoji: '💰',
  color: INCOME_CATEGORY_COLORS[0],
  emojiGroup: 0,
  saving: false,
  nameError: '',
};

export default function IncomeCategoryManagerScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  const load = useCallback(() => {
    getIncomeCategories().then((cats) => {
      setCategories(cats);
    });
  }, []);

  useFocusEffect(load);

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setModalVisible(true);
  };

  const openEdit = (cat: IncomeCategory) => {
    setForm({
      mode: 'edit',
      target: cat,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      emojiGroup: 0,
      saving: false,
      nameError: '',
    });
    setModalVisible(true);
  };

  const closeModal = () => {
    if (!form.saving) setModalVisible(false);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setField('nameError', 'Category name is required.');
      return;
    }
    setField('saving', true);
    try {
      if (form.mode === 'add') {
        await addIncomeCategory(name, form.emoji, form.color);
      } else if (form.target) {
        await updateIncomeCategory(form.target.id, name, form.emoji, form.color);
      }
      setModalVisible(false);
      load();
    } catch (err: unknown) {
      setField('saving', false);
      setField('nameError', err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const handleDelete = (cat: IncomeCategory) => {
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteIncomeCategory(cat.id);
            if (!result.ok) {
              Alert.alert('Cannot Delete', result.reason ?? 'Unknown error.');
            } else {
              load();
            }
          },
        },
      ],
    );
  };

  const builtIn = categories.filter((c) => c.isDefault === 1);
  const custom = categories.filter((c) => c.isDefault === 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Income Categories</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {categories.length} total · {custom.length} custom
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerAddBtn, { backgroundColor: colors.primary }]}
          onPress={openAdd}
        >
          <Ionicons name="add" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <SectionHeader label="Built-in" count={builtIn.length} colors={colors} />
        {builtIn.map((cat) => (
          <IncomeCategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => openEdit(cat)}
            onDelete={() => handleDelete(cat)}
          />
        ))}

        <SectionHeader label="Custom" count={custom.length} colors={colors} style={{ marginTop: 10 }} />
        {custom.length === 0 ? (
          <EmptyCustom colors={colors} onAdd={openAdd} />
        ) : (
          custom.map((cat) => (
            <IncomeCategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => openEdit(cat)}
              onDelete={() => handleDelete(cat)}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAdd}
      >
        <Ionicons name="add" size={28} color={colors.background} />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeModal} />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <IncomeCategoryForm
              form={form}
              setField={setField}
              onSave={handleSave}
              onClose={closeModal}
              colors={colors}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function SectionHeader({
  label, count, colors, style,
}: { label: string; count: number; colors: ReturnType<typeof useTheme>['colors']; style?: object }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
        {label.toUpperCase()}
      </Text>
      <View style={[styles.countBadge, { backgroundColor: colors.inputFill }]}>
        <Text style={[styles.countText, { color: colors.textSecondary }]}>{count}</Text>
      </View>
    </View>
  );
}

function EmptyCustom({
  colors, onAdd,
}: { colors: ReturnType<typeof useTheme>['colors']; onAdd: () => void }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.emptyEmoji}>🏷️</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No custom categories</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Create your own to personalize income tracking
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
        onPress={onAdd}
      >
        <Ionicons name="add" size={16} color={colors.background} />
        <Text style={[styles.emptyBtnText, { color: colors.background }]}>Add Category</Text>
      </TouchableOpacity>
    </View>
  );
}

interface FormProps {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function IncomeCategoryForm({ form, setField, onSave, onClose, colors }: FormProps) {
  const isBuiltIn = form.target?.isDefault === 1;
  const currentGroup = EMOJI_GROUPS[form.emojiGroup];

  return (
    <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <View style={styles.sheetHeader}>
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
          {form.mode === 'add' ? 'New Category' : 'Edit Category'}
        </Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewRow}>
        <View style={[styles.previewBadge, { backgroundColor: form.color }]}>
          <Text style={styles.previewEmoji}>{form.emoji}</Text>
        </View>
        <View style={styles.previewInfo}>
          <Text style={[styles.previewName, { color: colors.textPrimary }]}>
            {form.name || 'Category Name'}
          </Text>
          {isBuiltIn && (
            <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
              Built-in · emoji & color only
            </Text>
          )}
        </View>
      </View>

      {!isBuiltIn && (
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.textInput, { color: colors.textPrimary, backgroundColor: colors.inputFill, borderColor: form.nameError ? colors.danger : colors.border }]}
            placeholder="e.g. Salary, Freelance…"
            placeholderTextColor={colors.textSecondary}
            value={form.name}
            onChangeText={(v) => { setField('name', v); setField('nameError', ''); }}
            autoCapitalize="words"
            maxLength={24}
          />
          {!!form.nameError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{form.nameError}</Text>
          )}
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Accent Color</Text>
        <View style={styles.colorRow}>
          {INCOME_CATEGORY_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setField('color', c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                form.color === c && styles.colorSelected,
              ]}
            >
              {form.color === c && (
                <Ionicons name="checkmark" size={14} color="#fff" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.groupTabScroll}
          contentContainerStyle={styles.groupTabContent}
        >
          {EMOJI_GROUPS.map((g, i) => (
            <TouchableOpacity
              key={g.label}
              onPress={() => setField('emojiGroup', i)}
              style={[
                styles.groupTab,
                { backgroundColor: form.emojiGroup === i ? colors.primary : colors.inputFill },
              ]}
            >
              <Text style={styles.groupTabEmoji}>{g.icon}</Text>
              <Text style={[
                styles.groupTabLabel,
                { color: form.emojiGroup === i ? colors.background : colors.textSecondary },
              ]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.emojiGrid}>
          {currentGroup.emojis.map((em) => (
            <TouchableOpacity
              key={em}
              onPress={() => setField('emoji', em)}
              style={[
                styles.emojiCell,
                form.emoji === em && { backgroundColor: colors.primary + '33', borderRadius: 10 },
              ]}
            >
              <Text style={styles.emojiCellText}>{em}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: form.saving ? colors.border : colors.primary }]}
        onPress={onSave}
        disabled={form.saving}
      >
        <Text style={[styles.saveBtnText, { color: colors.background }]}>
          {form.saving ? 'Saving…' : form.mode === 'add' ? 'Create Category' : 'Save Changes'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  headerAddBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  countBadge: { marginLeft: 8, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
  countText: { fontSize: 11, fontWeight: '600' },
  emptyCard: {
    borderRadius: 16, padding: 28, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  emptyDesc: { fontSize: 13, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4, shadowOpacity: 0.25, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000055' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingBottom: 20, maxHeight: '90%' },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 8 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { fontSize: 18, fontWeight: '700' },
  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  previewBadge: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  previewEmoji: { fontSize: 28 },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 17, fontWeight: '700' },
  previewSub: { fontSize: 12, marginTop: 3 },
  field: { marginBottom: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8, letterSpacing: 0.5 },
  textInput: {
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  errorText: { fontSize: 12, marginTop: 4 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSelected: { borderWidth: 3, borderColor: '#fff' },
  groupTabScroll: { marginBottom: 12 },
  groupTabContent: { gap: 8, paddingBottom: 4 },
  groupTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
  },
  groupTabEmoji: { fontSize: 14 },
  groupTabLabel: { fontSize: 12, fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiCell: { width: '13%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  emojiCellText: { fontSize: 24 },
  saveBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});