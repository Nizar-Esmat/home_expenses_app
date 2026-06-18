import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { monthKeyToLabel } from '@/services/constants';

interface Props {
  selectedMonthKey: string;
  availableMonthKeys: string[];
  onSelectMonth: (monthKey: string) => void;
}

const ALL_MONTHS_KEY = 'ALL';

export default function PeriodSelector({ selectedMonthKey, availableMonthKeys, onSelectMonth }: Props) {
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
        <Text style={styles.title}>Statistics</Text>
        <TouchableOpacity style={styles.selector} onPress={() => setVisible(true)} activeOpacity={0.8}>
          <Text style={styles.monthText}>{label}</Text>
          <Ionicons name="chevron-down" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
      <Text style={styles.scopeText}>{scopeText}</Text>

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Period</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Ionicons name="close" size={22} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {options.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.option, key === selectedMonthKey && styles.optionActive]}
                  onPress={() => {
                    onSelectMonth(key);
                    setVisible(false);
                  }}
                >
                  <Text style={[styles.optionText, key === selectedMonthKey && styles.optionTextActive]}>
                    {key === ALL_MONTHS_KEY ? 'All Time' : monthKeyToLabel(key)}
                  </Text>
                  {key === selectedMonthKey && <Ionicons name="checkmark" size={18} color="#10B981" />}
                </TouchableOpacity>
              ))}
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
    color: '#F8FAFC',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#1A2332',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#263247',
  },
  monthText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#AAB2C0',
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: '#263247',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: '#1A2332',
  },
  optionActive: {
    backgroundColor: '#1F2937',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  optionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  optionTextActive: {
    color: '#10B981',
  },
});
