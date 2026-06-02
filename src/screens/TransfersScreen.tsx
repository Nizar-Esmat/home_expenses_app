import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
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
      <View style={[styles.center, { backgroundColor: colors.background }]}> 
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Transfers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}> 
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.monthFilterBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setMonthMenuOpen((open) => !open)}
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

          {monthMenuOpen && (
            <>
              <TouchableOpacity
                style={styles.monthMenuBackdrop}
                activeOpacity={1}
                onPress={() => setMonthMenuOpen(false)}
              />
              <View
                style={[styles.monthMenu, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <ScrollView nestedScrollEnabled style={styles.monthMenuList}>
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
                  >
                    <View style={styles.monthMenuItemContent}>
                      <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                      <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}>All months</Text>
                      {selectedMonthKey === ALL_MONTHS_KEY && (
                        <Ionicons name="checkmark" size={18} color={colors.primary} />
                      )}
                    </View>
                  </TouchableOpacity>

                  {availableMonthKeys.map((key) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.monthMenuItem,
                        selectedMonthKey === key && { backgroundColor: colors.primary + '20' },
                      ]}
                      onPress={() => {
                        setMonthMenuOpen(false);
                        setSelectedMonthKey(key);
                        load(key);
                      }}
                    >
                      <View style={styles.monthMenuItemContent}>
                        <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
                        <Text style={[styles.monthMenuItemText, { color: colors.textPrimary }]}> 
                          {monthKeyToLabel(key)}
                        </Text>
                        {selectedMonthKey === key && (
                          <Ionicons name="checkmark" size={18} color={colors.primary} />
                        )}
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          )}
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
          >
            <Text style={[styles.loadMoreText, { color: colors.textSecondary }]}>Load more</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  monthFilterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, gap: 8,
    minWidth: 160,
  },
  monthFilterText: { fontSize: 13, fontWeight: '600', flex: 1 },
  monthMenuBackdrop: {
    position: 'absolute', top: -2400, left: -2400, width: 4800, height: 4800, zIndex: 1,
  },
  monthMenu: {
    position: 'absolute', top: 42, left: 0, width: 200,
    borderWidth: 1, borderRadius: 12, paddingVertical: 6, zIndex: 2, elevation: 6,
  },
  monthMenuList: { maxHeight: 240 },
  monthMenuItem: {
    paddingHorizontal: 12, paddingVertical: 10, marginHorizontal: 6, borderRadius: 8,
  },
  monthMenuItemContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthMenuItemText: { fontSize: 14, fontWeight: '600', flex: 1 },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 40, marginBottom: 10 },
  emptyText: { fontSize: 14 },
  loadMoreBtn: {
    borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center', marginTop: 8,
  },
  loadMoreText: { fontSize: 13, fontWeight: '600' },
});
