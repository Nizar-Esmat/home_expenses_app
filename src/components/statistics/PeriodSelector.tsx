import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { monthKeyToLabel } from '@/services/constants';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  selectedMonthKey: string;
  availableMonthKeys: string[];
  onSelectMonth: (monthKey: string) => void;
}

const ALL_MONTHS_KEY = 'ALL';

export default function PeriodSelector({ selectedMonthKey, availableMonthKeys, onSelectMonth }: Props) {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);

  const options = [...availableMonthKeys];
  if (!options.includes(ALL_MONTHS_KEY)) {
    options.push(ALL_MONTHS_KEY);
  }

  const isAllTime = selectedMonthKey === ALL_MONTHS_KEY;
  const label = isAllTime ? 'All Time' : monthKeyToLabel(selectedMonthKey);
  const scopeText = isAllTime
    ? 'Across all recorded transactions'
    : 'Monthly spending insights';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.textPrimary }]} accessibilityRole="header">Statistics</Text>
        <TouchableOpacity
          style={[styles.selector, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
          onPress={() => setVisible(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Selected period: ${label}. Tap to change period.`}
        >
          <Text style={[styles.monthText, { color: colors.textPrimary }]}>{label}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.scopeText, { color: colors.textSecondary }]}>{scopeText}</Text>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Period</Text>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close period selector"
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((key) => {
                const isActive = key === selectedMonthKey;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.option,
                      {
                        backgroundColor: isActive ? (colors.primary + '18') : colors.inputFill,
                        borderColor: isActive ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      onSelectMonth(key);
                      setVisible(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                  >
                    <Text style={[styles.optionText, { color: isActive ? colors.primary : colors.textPrimary }]}>
                      {key === ALL_MONTHS_KEY ? 'All Time' : monthKeyToLabel(key)}
                    </Text>
                    {isActive && <Ionicons name="checkmark" size={18} color={colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
    borderWidth: 1,
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
