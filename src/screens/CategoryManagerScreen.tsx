import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getCategoryUsageCounts,
} from '@/services/database';
import { CATEGORY_COLORS, SPLIT_CATEGORY_NAME } from '@/services/constants';
import { Category } from '@/types';
import CategoryCard from '@/components/CategoryCard';
import { useAppDialog } from '@/components/AppDialog';
import ScreenHeader from '@/components/ScreenHeader';
import {
  EmojiKeyboard,
  type EmojiType,
} from '@softwhere-uz/react-native-emoji-keyboard';
import { getEmojiKeyboardTheme } from '@/components/AppEmojiPicker';

const QUICK_CATEGORY_EMOJIS = [
  '🍔',
  '💡',
  '🚗',
  '🛍️',
  '🏠',
  '📦',
  '☕',
  '🍕',
  '🎮',
  '💊',
  '✈️',
  '🎬',
  '📚',
  '🏋️',
  '💼',
  '💰',
  '🐾',
  '🎁',
];

// ── Modal state type ──────────────────────────────────────────

interface FormState {
  mode: 'add' | 'edit';
  target: Category | null;
  name: string;
  emoji: string;
  color: string;
  budgetLimit: string;
  saving: boolean;
  nameError: string;
}

const INITIAL_FORM: FormState = {
  mode: 'add',
  target: null,
  name: '',
  emoji: '📦',
  color: CATEGORY_COLORS[0],
  budgetLimit: '',
  saving: false,
  nameError: '',
};

// ── Main screen ───────────────────────────────────────────────

export default function CategoryManagerScreen() {
  const { colors } = useTheme();
  const { showDialog } = useAppDialog();

  const [categories, setCategories] = useState<Category[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // ── Load data ───────────────────────────────────────────────

  const load = useCallback(() => {
    Promise.all([getCategories(), getCategoryUsageCounts()]).then(
      ([cats, counts]) => {
        setCategories(cats.filter((c) => c.name !== SPLIT_CATEGORY_NAME));
        setUsageCounts(counts);
      },
    );
  }, []);

  useFocusEffect(load);

  // ── Form helpers ────────────────────────────────────────────

  const openAdd = () => {
    setForm(INITIAL_FORM);
    setModalVisible(true);
  };

  const openEdit = (cat: Category) => {
    setForm({
      mode: 'edit',
      target: cat,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      budgetLimit: cat.budgetLimit != null && cat.budgetLimit > 0 ? String(cat.budgetLimit) : '',
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

  // ── Save ────────────────────────────────────────────────────

  const handleSave = async () => {
    const name = form.name.trim();
    if (!name) {
      setField('nameError', 'Category name is required.');
      return;
    }
    setField('saving', true);
    try {
      const parsedBudget = form.budgetLimit.trim()
        ? parseFloat(form.budgetLimit.trim().replace(',', '.'))
        : null;
      const validBudget =
        parsedBudget != null && !isNaN(parsedBudget) && parsedBudget > 0
          ? parsedBudget
          : null;

      if (form.mode === 'add') {
        await addCategory(name, form.emoji, form.color, validBudget);
      } else if (form.target) {
        await updateCategory(form.target.id, name, form.emoji, form.color, validBudget);
      }
      setModalVisible(false);
      load();
    } catch (err: unknown) {
      setField('saving', false);
      setField(
        'nameError',
        err instanceof Error ? err.message : 'Something went wrong.',
      );
    }
  };

  // ── Delete ──────────────────────────────────────────────────

  const handleDelete = (cat: Category) => {
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
            const result = await deleteCategory(cat.id);
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

  // ── Sections ────────────────────────────────────────────────

  const builtIn = categories.filter((c) => c.isDefault === 1);
  const custom = categories.filter((c) => c.isDefault === 0);

  // ── Render ──────────────────────────────────────────────────

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScreenHeader
        title='Categories'
        subtitle={`${categories.length} total · ${custom.length} custom`}
        alignTitle='left'
      />

      {/* List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Built-in */}
        <SectionHeader
          label='Built-in'
          subtitle='Default categories'
          colors={colors}
        />
        {builtIn.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            expenseCount={usageCounts[cat.name] ?? 0}
            onEdit={() => openEdit(cat)}
            onDelete={() => handleDelete(cat)}
          />
        ))}

        {/* Custom */}
        <SectionHeader
          label='Custom'
          subtitle='Your categories'
          colors={colors}
          style={{ marginTop: 10 }}
        />
        {custom.length === 0 ? (
          <EmptyCustom colors={colors} onAdd={openAdd} />
        ) : (
          custom.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              expenseCount={usageCounts[cat.name] ?? 0}
              onEdit={() => openEdit(cat)}
              onDelete={() => handleDelete(cat)}
            />
          ))
        )}

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={openAdd}
        accessibilityRole='button'
        accessibilityLabel='Add category'
      >
        <Ionicons name='add' size={28} color={colors.onPrimary} />
      </TouchableOpacity>

      {/* Add / Edit modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType='slide'
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            onPress={closeModal}
          />
          <View style={[styles.sheet, { backgroundColor: colors.card }]}>
            <CategoryForm
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

// ── Sub-components ────────────────────────────────────────────

function SectionHeader({
  label,
  subtitle,
  colors,
  style,
}: {
  label: string;
  subtitle: string;
  colors: ReturnType<typeof useTheme>['colors'];
  style?: object;
}) {
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
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  onAdd: () => void;
}) {
  return (
    <View
      style={[
        styles.emptyCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={styles.emptyEmoji}>🏷️</Text>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
        No custom categories yet
      </Text>
      <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
        Tap the + button to create one
      </Text>
    </View>
  );
}

// ── Form sheet ────────────────────────────────────────────────

interface FormProps {
  form: FormState;
  setField: <K extends keyof FormState>(key: K, val: FormState[K]) => void;
  onSave: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}

function CategoryForm({ form, setField, onSave, onClose, colors }: FormProps) {
  const isBuiltIn = form.target?.isDefault === 1;
  const [isBrowsingEmojis, setIsBrowsingEmojis] = useState(false);

  if (isBrowsingEmojis) {
    return (
      <View style={styles.browsingContainer}>
        {/* Sheet handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          <TouchableOpacity
            onPress={() => setIsBrowsingEmojis(false)}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole='button'
            accessibilityLabel='Back to Category'
          >
            <Ionicons name='arrow-back' size={20} color={colors.primary} />
            <Text style={[styles.backBtnText, { color: colors.primary }]}>
              Back
            </Text>
          </TouchableOpacity>
          <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>
            Choose Emoji
          </Text>
          <View style={{ width: 44 }} />
        </View>

        <View style={styles.keyboardWrapper}>
          <EmojiKeyboard
            onEmojiSelected={(e: EmojiType) => {
              setField('emoji', e.emoji);
              setIsBrowsingEmojis(false);
            }}
            enableSearchBar
            enableRecentlyUsed
            categoryPosition='top'
            defaultHeight={380}
            theme={getEmojiKeyboardTheme(colors)}
          />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps='handled'
    >
      {/* Sheet handle */}
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      {/* Title row */}
      <View style={styles.sheetHeader}>
        <Text
          style={[styles.sheetTitle, { color: colors.textPrimary }]}
          accessibilityRole='header'
        >
          {form.mode === 'add' ? 'New Category' : 'Edit Category'}
        </Text>
        <TouchableOpacity
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={styles.closeBtn}
          accessibilityRole='button'
          accessibilityLabel='Close'
        >
          <Ionicons name='close' size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Preview badge */}
      <View style={styles.previewRow}>
        <TouchableOpacity
          onPress={() => setIsBrowsingEmojis(true)}
          style={[styles.previewBadge, { backgroundColor: form.color }]}
          accessibilityRole='button'
          accessibilityLabel='Browse all emojis'
        >
          <Text style={styles.previewEmoji}>{form.emoji}</Text>
        </TouchableOpacity>
        <View style={styles.previewInfo}>
          <Text
            style={[
              styles.previewName,
              { color: colors.textPrimary, textAlign: 'auto' },
            ]}
          >
            {form.name || 'Category Name'}
          </Text>
          {isBuiltIn ? (
            <Text style={[styles.previewSub, { color: colors.textSecondary }]}>
              Built-in · emoji & color only
            </Text>
          ) : (
            <TouchableOpacity onPress={() => setIsBrowsingEmojis(true)}>
              <Text
                style={[
                  styles.previewSub,
                  { color: colors.primary, fontWeight: '600' },
                ]}
              >
                Tap badge to search all emojis →
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Name input */}
      {!isBuiltIn && (
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
            Name
          </Text>
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
            placeholder='e.g. Gym, Pets, Travel…'
            placeholderTextColor={colors.textSecondary}
            value={form.name}
            onChangeText={(v) => {
              setField('name', v);
              setField('nameError', '');
            }}
            onBlur={() => {
              if (!form.name.trim())
                setField('nameError', 'Category name is required.');
            }}
            autoCapitalize='words'
            maxLength={24}
            accessibilityLabel='Category name'
          />
          {!!form.nameError && (
            <Text style={[styles.errorText, { color: colors.danger }]}>
              {form.nameError}
            </Text>
          )}
        </View>
      )}

      {/* Monthly Budget Limit */}
      <View style={styles.field}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginBottom: 0 }]}>
            Monthly Budget Limit (Optional)
          </Text>
          {form.budgetLimit ? (
            <TouchableOpacity onPress={() => setField('budgetLimit', '')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 12, color: colors.danger, fontWeight: '600' }}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TextInput
          style={[
            styles.textInput,
            {
              color: colors.textPrimary,
              backgroundColor: colors.inputFill,
              borderColor: colors.border,
            },
          ]}
          placeholder='e.g. 5000'
          placeholderTextColor={colors.textSecondary}
          value={form.budgetLimit}
          onChangeText={(v) => setField('budgetLimit', v.replace(/[^0-9.]/g, ''))}
          keyboardType='decimal-pad'
          accessibilityLabel='Monthly budget limit'
        />
        <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
          BudgetBuddy will warn you when your spending reaches 90% of this limit.
        </Text>
      </View>

      {/* Color picker */}
      <View style={styles.field}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
          Accent Color
        </Text>
        <View
          style={styles.colorRow}
          accessibilityRole='radiogroup'
          accessibilityLabel='Accent color'
        >
          {CATEGORY_COLORS.map((c) => {
            const isSelected = form.color === c;
            return (
              <TouchableOpacity
                key={c}
                onPress={() => setField('color', c)}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: c },
                  isSelected && {
                    borderWidth: 2.5,
                    borderColor: colors.textPrimary,
                  },
                ]}
                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                accessibilityRole='radio'
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`Color ${c}`}
              >
                {isSelected && (
                  <Ionicons name='checkmark' size={18} color='#FFFFFF' />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={[styles.colorHex, { color: colors.textSecondary }]}>
          {form.color}
        </Text>
      </View>

      {/* Emoji picker */}
      <View style={styles.field}>
        <View style={styles.iconFieldHeader}>
          <Text
            style={[
              styles.fieldLabel,
              { color: colors.textSecondary, marginBottom: 0 },
            ]}
          >
            Icon
          </Text>
          <TouchableOpacity
            onPress={() => setIsBrowsingEmojis(true)}
            style={[styles.browseAllBtn, { backgroundColor: colors.inputFill }]}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityRole='button'
            accessibilityLabel='Search all emojis'
          >
            <Ionicons name='search' size={14} color={colors.primary} />
            <Text style={[styles.browseAllText, { color: colors.primary }]}>
              Search All Emojis
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quick emoji grid */}
        <View style={styles.emojiGrid}>
          {QUICK_CATEGORY_EMOJIS.map((em) => {
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
                accessibilityRole='button'
                accessibilityLabel={`Emoji ${em}`}
              >
                <Text style={styles.emojiCellText}>{em}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save button */}
      <TouchableOpacity
        style={[
          styles.saveBtn,
          { backgroundColor: form.saving ? colors.border : colors.primary },
          form.saving && { opacity: 0.5 },
        ]}
        onPress={onSave}
        disabled={form.saving}
        accessibilityRole='button'
        accessibilityLabel={
          form.mode === 'add' ? 'Create Category' : 'Save Changes'
        }
      >
        <Text style={[styles.saveBtnText, { color: colors.onPrimary }]}>
          {form.saving
            ? 'Saving…'
            : form.mode === 'add'
              ? 'Create Category'
              : 'Save Changes'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1 },

  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { padding: 20 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionLabel: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 2 },

  emptyCard: {
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptyDesc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },

  fab: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000055',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700' },

  previewRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  previewBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  previewEmoji: { fontSize: 28 },
  previewInfo: { flex: 1 },
  previewName: { fontSize: 17, fontWeight: '700' },
  previewSub: { fontSize: 12, marginTop: 3 },

  field: { marginBottom: 20 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: { fontSize: 12, marginTop: 4 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorHex: { fontSize: 11, marginTop: 8, letterSpacing: 0.5 },

  iconFieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  browseAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  browseAllText: { fontSize: 12, fontWeight: '700' },

  browsingContainer: { minHeight: 460 },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingRight: 8,
  },
  backBtnText: { fontSize: 15, fontWeight: '600' },
  keyboardWrapper: { height: 400, overflow: 'hidden' },

  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  emojiCell: {
    width: '14.5%',
    aspectRatio: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  emojiCellSelected: {
    borderWidth: 2,
    backgroundColor: '#00000015',
  },
  emojiCellText: { fontSize: 24 },

  saveBtn: {
    borderRadius: 14,
    minHeight: 48,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  saveBtnText: { fontSize: 16, fontWeight: '700' },
});
