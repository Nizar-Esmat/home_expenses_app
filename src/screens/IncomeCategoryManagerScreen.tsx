import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform,
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
import { useAppDialog } from '@/components/AppDialog';

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
  const { showDialog } = useAppDialog();

  const [categories, setCategories] = useState<IncomeCategory[]>([]);
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
    showDialog({
      title: 'Delete Category',
      message: `Are you sure you want to delete "${cat.name}"?`,
      icon: '🗑️',
      type: 'danger',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteIncomeCategory(cat.id);
            if (!result.ok) {
              showDialog({
                title: 'Cannot Delete',
                message: result.reason ?? 'Unknown error.',
                icon: '⚠️',
                type: 'warning',
                buttons: [{ text: 'OK', style: 'default' }],
              });
            } else {
              load();
            }
          },
        },
      ],
    });
  };

  const builtIn = categories.filter((c) => c.isDefault === 1);
  const custom = categories.filter((c) => c.isDefault === 0);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Income Categories</Text>
          <Text style={[styles.headerSub, { color: colors.textSecondary }]}>
            {categories.length} total · {custom.length} custom
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <SectionHeader label="Built-in" subtitle="Default categories" colors={colors} />
        {builtIn.map((cat) => (
          <IncomeCategoryCard
            key={cat.id}
            category={cat}
            onEdit={() => openEdit(cat)}
            onDelete={() => handleDelete(cat)}
          />
        ))}

        <SectionHeader label="Custom" subtitle="Your categories" colors={colors} style={{ marginTop: 10 }} />
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
        accessibilityRole="button"
        accessibilityLabel="Add income category"
      >
        <Ionicons name="add" size={28} color={colors.onPrimary} />
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
  label, subtitle, colors, style,
}: { label: string; subtitle: string; colors: ReturnType<typeof useTheme>['colors']; style?: object }) {
  return (
    <View style={[styles.sectionRow, style]}>
      <View>
        <Text style={[styles.sectionLabel, { color: colors.textPrimary }]}>
          {label}
        </Text>
        <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
          {subtitle}
        </Text>
      </View>
    </View>
  );
}

function EmptyCustom({
  colors,
}: { colors: ReturnType<typeof useTheme>['colors']; onAdd: () => void }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.emptyEmoji}>🏷️</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No custom categories yet</Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Tap the + button to create one
      </Text>
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
        <Text style={[styles.sheetTitle, { color: colors.textPrimary }]} accessibilityRole="header">
          {form.mode === 'add' ? 'New Category' : 'Edit Category'}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.previewRow}>
        <View style={[styles.previewBadge, { backgroundColor: form.color }]}>
          <Text style={styles.previewEmoji}>{form.emoji}</Text>
        </View>
        <View style={styles.previewInfo}>
          <Text style={[styles.previewName, { color: colors.textPrimary, textAlign: 'auto' }]}>
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
            style={[
              styles.textInput,
              {
                color: colors.textPrimary,
                backgroundColor: colors.inputFill,
                borderColor: form.nameError ? colors.danger : colors.border,
                textAlign: 'auto',
              },
            ]}
            placeholder="e.g. Salary, Freelance…"
            placeholderTextColor={colors.textSecondary}
            value={form.name}
            onChangeText={(v) => { setField('name', v); setField('nameError', ''); }}
            onBlur={() => {
              if (!form.name.trim()) setField('nameError', 'Category name is required.');
            }}
            autoCapitalize="words"
            maxLength={24}
            accessibilityLabel="Category name"
          />
          {!!form.nameError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>{form.nameError}</Text>
          )}
        </View>
      )}

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Accent Color</Text>
        <View style={styles.colorRow} accessibilityRole="radiogroup" accessibilityLabel="Accent color">
          {INCOME_CATEGORY_COLORS.map((c) => {
            const isSelected = form.color === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setField('color', c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  isSelected && { borderWidth: 2.5, borderColor: colors.textPrimary },
                ]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Color ${c}`}
              >
                {isSelected && (
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.colorHex, { color: colors.textSecondary }]}>
          {form.color}
        </Text>
      </View>

      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Icon</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.groupTabScroll}
          contentContainerStyle={styles.groupTabContent}
        >
          {EMOJI_GROUPS.map((g, i) => {
            const isSelected = form.emojiGroup === i;
            return (
              <TouchableOpacity
                key={g.label}
                onPress={() => setField('emojiGroup', i)}
                style={[
                  styles.groupTab,
                  { backgroundColor: isSelected ? colors.primary : colors.inputFill },
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={g.label}
              >
                <Text style={styles.groupTabEmoji}>{g.icon}</Text>
                <Text style={[
                  styles.groupTabLabel,
                  { color: isSelected ? colors.onPrimary : colors.textSecondary },
                ]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.emojiGrid}>
          {currentGroup.emojis.map((em) => {
            const isSelected = form.emoji === em;
            return (
              <TouchableOpacity
                key={em}
                onPress={() => setField('emoji', em)}
                style={[
                  styles.emojiCell,
                  isSelected && styles.emojiCellSelected,
                  isSelected && { borderColor: colors.primary },
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Emoji ${em}`}
              >
                <Text style={styles.emojiCellText}>{em}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: form.saving ? colors.border : colors.primary },
          form.saving && { opacity: 0.5 },
        ]}
        onPress={onSave}
        disabled={form.saving}
        accessibilityRole="button"
        accessibilityLabel={form.mode === 'add' ? 'Create Category' : 'Save Changes'}
      >
        <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, marginLeft: 8 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSub: { fontSize: 12, marginTop: 2 },

  content: { padding: 16 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 2 },

  emptyCard: {
    borderRadius: 16, padding: 28, alignItems: 'center',
    borderWidth: 1.5, borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

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
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
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
    fontSize: 16,
  },
  errorText: { fontSize: 12, marginTop: 4 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  colorHex: { fontSize: 11, marginTop: 8, letterSpacing: 0.5 },
  groupTabScroll: { marginBottom: 12 },
  groupTabContent: { gap: 8, paddingBottom: 4 },
  groupTab: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, minHeight: 44, borderRadius: 22,
  },
  groupTabEmoji: { fontSize: 14 },
  groupTabLabel: { fontSize: 12, fontWeight: '600' },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  emojiCell: {
    width: '13%', aspectRatio: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 10,
  },
  emojiCellSelected: {
    borderWidth: 2, backgroundColor: '#00000015',
  },
  emojiCellText: { fontSize: 24 },
  saveBtn: { borderRadius: 14, minHeight: 48, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});