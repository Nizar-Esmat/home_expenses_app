import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from '../SkeletonBlock';

export default function DailySpendingSkeleton() {
  const d = (i: number) => i * 80;

  return (
    <View style={[styles.container]}>
      <SkeletonBlock height={130} borderRadius={16} delay={d(0)} />
      <SkeletonBlock height={48} borderRadius={12} delay={d(1)} />
      <View style={styles.row}>
        <SkeletonBlock height={40} borderRadius={10} style={styles.half} delay={d(2)} />
        <SkeletonBlock height={40} borderRadius={10} style={styles.half} delay={d(3)} />
      </View>
      <SkeletonBlock height={40} borderRadius={10} delay={d(4)} />
      <SkeletonBlock height={56} borderRadius={14} delay={d(5)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
});
