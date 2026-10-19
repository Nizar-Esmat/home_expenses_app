import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import SkeletonBlock from '@/components/SkeletonBlock';

export default function LoadingSkeleton() {
  const d = (i: number) => i * 40;

  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. Header ghost */}
      <View style={styles.header}>
        <SkeletonBlock height={32} width={120} borderRadius={8} delay={d(0)} />
      </View>

      {/* 2. Total Balance Card ghost */}
      <View style={styles.balanceCard}>
        <SkeletonBlock height={16} width={90} borderRadius={4} delay={d(1)} />
        <View style={{ height: 10 }} />
        <SkeletonBlock height={42} width={220} borderRadius={8} delay={d(2)} />
        <View style={{ height: 8 }} />
        <SkeletonBlock height={14} width={150} borderRadius={4} delay={d(3)} />
      </View>

      {/* 3. Accounts section header + cards */}
      <View style={styles.sectionHeader}>
        <SkeletonBlock height={20} width={80} borderRadius={6} delay={d(4)} />
        <SkeletonBlock height={16} width={60} borderRadius={6} delay={d(4)} />
      </View>
      <View style={styles.accountsRow}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={76} borderRadius={16} delay={d(5)} />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={76} borderRadius={16} delay={d(6)} />
        </View>
      </View>

      {/* 4. Monthly Summary Card ghost (Net savings + 2-col split) */}
      <View style={styles.sectionHeader}>
        <SkeletonBlock height={20} width={90} borderRadius={6} delay={d(7)} />
      </View>
      <SkeletonBlock height={140} borderRadius={18} delay={d(8)} />

      {/* 5. Recent Transactions ghost (4 realistic rows) */}
      <View style={styles.sectionHeader}>
        <SkeletonBlock height={20} width={150} borderRadius={6} delay={d(9)} />
        <SkeletonBlock height={16} width={60} borderRadius={6} delay={d(9)} />
      </View>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={styles.txRow}>
          <View style={styles.txLeft}>
            <SkeletonBlock height={40} width={40} borderRadius={20} delay={d(10 + i)} />
            <View style={styles.txInfo}>
              <SkeletonBlock height={16} width={110} borderRadius={4} delay={d(10 + i)} />
              <View style={{ height: 6 }} />
              <SkeletonBlock height={12} width={70} borderRadius={4} delay={d(10 + i)} />
            </View>
          </View>
          <SkeletonBlock height={18} width={80} borderRadius={4} delay={d(10 + i)} />
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 16 },
  balanceCard: { paddingVertical: 12, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  accountsRow: { flexDirection: 'row', marginBottom: 12 },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.1)',
  },
  txLeft: { flexDirection: 'row', alignItems: 'center' },
  txInfo: { marginLeft: 12 },
});