import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import TransfersSkeleton from '@/components/skeletons/TransfersSkeleton';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import {
  getAllTransfers,
  getTransfersByMonth,
  deleteTransfer,
  getSettings,
  getActiveAccounts,
  getAvailableTransferMonthKeys,
} from '@/services/database';
import { Account, Settings, Transfer } from '@/types';
import { currentMonthKey, monthKeyToLabel } from '@/services/constants';
import TransferTile from '@/components/TransferTile';

const ALL_MONTHS_KEY = 'all';
const BATCH_SIZE = 30;

export default function TransfersScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const currentMonth = currentMonthKey();

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [accountMap, setAccountMap] = useState<Record<number, Account>>({});
  const [availableMonthKeys, setAvailableMonthKeys] = useState<string[]>([currentMonth]);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(currentMonth);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const load = useCallback((monthKey: string = selectedMonthKey) => {
    setLoading(true);
    setMonthMenuOpen(false);
    const transferPromise = monthKey === ALL_MONTHS_KEY
      ? getAllTransfers()
      : getTransfersByMonth(monthKey);

    const activeKey = monthKey;

    Promise.all([
      transferPromise,
      getSettings(),
      getActiveAccounts(),
      getAvailableTransferMonthKeys(),
    ]).then(([trs, sets, accs, monthKeys]) => {
      setTransfers(trs);
      setSettings(sets);
      const mergedMonths = Array.from(new Set([
        currentMonth,
        ...(activeKey !== ALL_MONTHS_KEY ? [activeKey] : []),
        ...monthKeys,
      ])).sort((a, b) => b.localeCompare(a));
      setAvailableMonthKeys(mergedMonths);
      const aMap: Record<number, Account> = {};
      accs.forEach((a) => (aMap[a.id] = a));
      setAccountMap(aMap);
      setVisibleCount(BATCH_SIZE);
      setLoading(false);
    });
  }, [currentMonth, selectedMonthKey]);

  useFocusEffect(useCallback(() => {
    load(selectedMonthKey);
  }, [load, selectedMonthKey]));

  const selectedMonthLabel = selectedMonthKey === ALL_MONTHS_KEY
    ? 'All months'
    : monthKeyToLabel(selectedMonthKey);

  const visible = transfers.slice(0, visibleCount);

  const handleDeleteTransfer = (id: number) => {
    deleteTransfer(id).then(() => load(selectedMonthKey));
  };

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <TransfersSkeleton />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Transfers</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}> 
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.monthFilterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setMonthMenuOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel={`Selected period: ${selectedMonthLabel}`}
            accessibilityState={{ expanded: monthMenuOpen }}
          >
            <Text style={[styles.monthFilterText, { color: colors.textPrimary }]} numberOfLines={1}> 
              {selectedMonthLabel}
            </Text>
            <Ionicons
              name={monthMenuOpen ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {visible.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🔁</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
              No transfers in this period
            </Text>
          </View>
        ) : (
          visible.map((tr) => (
            <TransferTile
              key={tr.id}
              transfer={tr}
              currency={settings?.currency ?? 'EGP'}
              fromAccountName={accountMap[tr.fromAccountId]?.name}
              fromAccountIcon={accountMap[tr.fromAccountId]?.icon ?? undefined}
              toAccountName={accountMap[tr.toAccountId]?.name}
              toAccountIcon={accountMap[tr.toAccountId]?.icon ?? undefined}
              onDelete={() => handleDeleteTransfer(tr.id)}
            />
          ))
        )}

        {visibleCount < transfers.length && (
          <TouchableOpacity
            style={[styles.loadMoreBtn, { borderColor: colors.border }]}
            onPress={() => setVisibleCount((c) => Math.min(c + BATCH_SIZE, transfers.length))}
            accessibilityRole="button"
            accessibilityLabel="Load more transfers"
          >
            <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>Load more</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Month Selection Modal */}
      <Modal
        visible={monthMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMonthMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setMonthMenuOpen(false)}
        >
          <View
            style={[styles.monthMenuModal, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.monthMenuItem,
                  selectedMonthKey === ALL_MONTHS_KEY && { backgroundColor: colors.primary + '20' },
                ]}
                onPress={() => {
                  setMonthMenuOpen(false);
                  setSelectedMonthKey(ALL_MONTHS_KEY);
                  load(ALL_MONTHS_KEY);
                }}
                accessibilityRole="radio"
                accessibilityState={{ selected: selectedMonthKey === ALL_MONTHS_KEY }}
                accessibilityLabel="All months"
              >
                <View style={styles.monthMenuItemContent}>
                  <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                  <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}>All months</Text>
                  {selectedMonthKey === ALL_MONTHS_KEY && (
                    <Ionicons name="checkmark" size={18} color={colors.primary} />
                  )}
                </View>
              </TouchableOpacity>

              {availableMonthKeys.map((key) => {
                const isSelected = selectedMonthKey === key;
                const label = monthKeyToLabel(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.monthMenuItem,
                      isSelected && { backgroundColor: colors.primary + '20' },
                    ]}
                    onPress={() => {
                      setMonthMenuOpen(false);
                      setSelectedMonthKey(key);
                      load(key);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={label}
                  >
                    <View style={styles.monthMenuItemContent}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                      <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}> 
                        {label}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  monthFilterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 8,
    minWidth: 160,
    minHeight: 44,
  },
  monthFilterText: { fontSize: 13, fontWeight: '600', flex: 1 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  monthMenuModal: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  monthMenuItem: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 10,
  },
  monthMenuItemContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthMenuItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  loadMoreBtn: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600' },
});
