import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from '../SkeletonBlock';

export default function TransactionsSkeleton() {
  // Wave effect: each row delays by 80ms
  const d = (i: number) => i * 80;

  return (
    <View style={styles.container}>
      {/* Header ghost row */}
      <View style={styles.headerRow}>
        <SkeletonBlock height={16} width="30%" borderRadius={6} delay={d(0)} />
        <SkeletonBlock height={16} width="20%" borderRadius={6} delay={d(0)} />
      </View>

      {/* Search bar */}
      <SkeletonBlock height={48} borderRadius={12} delay={d(1)} />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        <SkeletonBlock height={28} width="20%" borderRadius={999} delay={d(2)} />
        <SkeletonBlock height={28} width="20%" borderRadius={999} delay={d(3)} />
        <SkeletonBlock height={28} width="20%" borderRadius={999} delay={d(4)} />
        <SkeletonBlock height={28} width="20%" borderRadius={999} delay={d(5)} />
      </View>

      {/* Sort indicator */}
      <SkeletonBlock height={32} borderRadius={8} delay={d(6)} />

      {/* Summary strip */}
      <SkeletonBlock height={120} borderRadius={14} delay={d(7)} />

      {/* Transaction rows */}
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <View key={i} style={styles.txRow}>
          <View style={styles.txLeft}>
            <SkeletonBlock height={40} width={40} borderRadius={20} delay={d(7 + i)} />
            <View style={styles.txInfo}>
              <SkeletonBlock height={16} width="60%" borderRadius={4} delay={d(7 + i)} />
              <SkeletonBlock height={12} width="40%" borderRadius={4} delay={d(7 + i)} />
            </View>
          </View>
          <SkeletonBlock height={16} width="20%" borderRadius={4} delay={d(7 + i)} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  txRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderRadius: 14, gap: 12,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  txInfo: { gap: 6, width: 160 },
});
