import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { Category } from '@/types';

interface Props {
  categories: Category[];
  selectedCategoryIds: number[] | null; // null means 'All'
  onSelectCategories: (ids: number[] | null) => void;
  routineCategoryIds?: number[];
  onSaveRoutinePreset?: (ids: number[]) => void;
}

export default function CategoryFilterBar({
  categories,
  selectedCategoryIds,
  onSelectCategories,
  routineCategoryIds,
  onSaveRoutinePreset,
}: Props) {
  const { colors } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalDraftIds, setModalDraftIds] = useState<number[]>([]);

  // Default routine categories (excluding high-cost / one-off items like Education/Course/Rent if no custom setting)
  const effectiveRoutineIds = useMemo(() => {
    if (routineCategoryIds && routineCategoryIds.length > 0) {
      return routineCategoryIds;
    }
    const nonRoutineKeywords = ['education', 'course', 'tuition', 'rent', 'electronic', 'device', 'furniture'];
    return categories
      .filter((c) => !nonRoutineKeywords.some((kw) => c.name.toLowerCase().includes(kw)))
      .map((c) => c.id);
  }, [routineCategoryIds, categories]);

  const isAllActive = selectedCategoryIds === null || selectedCategoryIds.length === 0;

  const isRoutineActive = useMemo(() => {
    if (isAllActive || !selectedCategoryIds) return false;
    if (selectedCategoryIds.length !== effectiveRoutineIds.length) return false;
    const routineSet = new Set(effectiveRoutineIds);
    return selectedCategoryIds.every((id) => routineSet.has(id));
  }, [isAllActive, selectedCategoryIds, effectiveRoutineIds]);

  const handleOpenModal = () => {
    if (isAllActive) {
      setModalDraftIds(categories.map((c) => c.id));
    } else {
      setModalDraftIds([...(selectedCategoryIds ?? [])]);
    }
    setModalVisible(true);
  };

  const handleToggleSingleCategory = (catId: number) => {
    if (isAllActive) {
      // Switch from All to just this category
      onSelectCategories([catId]);
    } else if (selectedCategoryIds?.includes(catId)) {
      const remaining = selectedCategoryIds.filter((id) => id !== catId);
      onSelectCategories(remaining.length > 0 ? remaining : null);
    } else {
      onSelectCategories([...(selectedCategoryIds ?? []), catId]);
    }
  };

  const handleDraftToggle = (catId: number) => {
    setModalDraftIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId],
    );
  };

  const handleApplyModal = () => {
    if (modalDraftIds.length === 0 || modalDraftIds.length === categories.length) {
      onSelectCategories(null);
    } else {
      onSelectCategories(modalDraftIds);
    }
    setModalVisible(false);
  };

  const handleSaveAsRoutinePreset = () => {
    if (onSaveRoutinePreset && modalDraftIds.length > 0) {
      onSaveRoutinePreset(modalDraftIds);
    }
  };

  const selectedCount = selectedCategoryIds ? selectedCategoryIds.length : categories.length;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* All Categories Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: isAllActive ? colors.primary : colors.inputFill,
              borderColor: isAllActive ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelectCategories(null)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Show all categories"
          accessibilityState={{ selected: isAllActive }}
        >
          <Text
            style={[
              styles.chipText,
              { color: isAllActive ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Routine Preset Chip */}
        <TouchableOpacity
          style={[
            styles.chip,
            {
              backgroundColor: isRoutineActive ? colors.primary : colors.inputFill,
              borderColor: isRoutineActive ? colors.primary : colors.border,
            },
          ]}
          onPress={() => onSelectCategories(effectiveRoutineIds)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Filter by routine daily categories"
          accessibilityState={{ selected: isRoutineActive }}
        >
          <Ionicons
            name="flash-outline"
            size={14}
            color={isRoutineActive ? '#FFFFFF' : colors.primary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.chipText,
              { color: isRoutineActive ? '#FFFFFF' : colors.textPrimary },
            ]}
          >
            Routine
          </Text>
        </TouchableOpacity>

        {/* Individual Category Chips */}
        {categories.map((cat) => {
          const isSelected = !isAllActive && (selectedCategoryIds?.includes(cat.id) ?? false);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected ? colors.primary : colors.inputFill,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
              onPress={() => handleToggleSingleCategory(cat.id)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`Category ${cat.name}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={styles.chipEmoji}>{cat.emoji}</Text>
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Filter Modal Button */}
        <TouchableOpacity
          style={[
            styles.filterBtn,
            {
              backgroundColor: !isAllActive ? colors.primary + '20' : colors.inputFill,
              borderColor: !isAllActive ? colors.primary : colors.border,
            },
          ]}
          onPress={handleOpenModal}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Open category filter modal"
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={!isAllActive ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.filterBtnText,
              { color: !isAllActive ? colors.primary : colors.textSecondary },
            ]}
          >
            Filter {!isAllActive && `(${selectedCount})`}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Multi-Select Category Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Filter Categories
                </Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Select categories to include in statistics
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityRole="button"
                accessibilityLabel="Close filter"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Actions Bar */}
            <View style={styles.quickBar}>
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: colors.border }]}
                onPress={() => setModalDraftIds(categories.map((c) => c.id))}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.textPrimary }]}>
                  Select All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: colors.border }]}
                onPress={() => setModalDraftIds(effectiveRoutineIds)}
                activeOpacity={0.7}
              >
                <Ionicons name="flash-outline" size={13} color={colors.primary} />
                <Text style={[styles.quickBtnText, { color: colors.primary }]}>
                  Routine Only
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: colors.border }]}
                onPress={() => setModalDraftIds([])}
                activeOpacity={0.7}
              >
                <Text style={[styles.quickBtnText, { color: colors.danger }]}>
                  Clear
                </Text>
              </TouchableOpacity>
            </View>

            {/* Categories Scrollable List */}
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {categories.map((cat) => {
                const checked = modalDraftIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor: checked ? colors.primary + '14' : 'transparent',
                        borderColor: checked ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => handleDraftToggle(cat.id)}
                    activeOpacity={0.7}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                  >
                    <View style={styles.catLeft}>
                      <Text style={styles.catEmoji}>{cat.emoji}</Text>
                      <Text style={[styles.catName, { color: colors.textPrimary }]}>
                        {cat.name}
                      </Text>
                    </View>
                    <Ionicons
                      name={checked ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={checked ? colors.primary : colors.textSecondary}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Footer Buttons */}
            <View style={styles.modalFooter}>
              {onSaveRoutinePreset && (
                <TouchableOpacity
                  style={[styles.saveRoutineBtn, { borderColor: colors.border }]}
                  onPress={handleSaveAsRoutinePreset}
                  activeOpacity={0.7}
                >
                  <Ionicons name="bookmark-outline" size={14} color={colors.textSecondary} />
                  <Text style={[styles.saveRoutineText, { color: colors.textSecondary }]}>
                    Set as Routine preset
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.applyBtn, { backgroundColor: colors.primary }]}
                onPress={handleApplyModal}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Apply category filter"
              >
                <Text style={styles.applyBtnText}>
                  Apply ({modalDraftIds.length === 0 || modalDraftIds.length === categories.length ? 'All' : modalDraftIds.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 34,
  },
  chipEmoji: {
    fontSize: 14,
    marginRight: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 34,
    gap: 4,
  },
  filterBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxHeight: '80%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  quickBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryList: {
    maxHeight: 280,
    marginBottom: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 6,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catEmoji: {
    fontSize: 18,
  },
  catName: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalFooter: {
    gap: 10,
  },
  saveRoutineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  saveRoutineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  applyBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
