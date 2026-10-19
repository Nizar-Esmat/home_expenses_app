import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from '@/components/SkeletonBlock';

export default function StatisticsLoadingSkeleton() {
  const d = (i: number) => i * 40;

  return (
    <View style={styles.container}>
      <SkeletonBlock height={148} borderRadius={22} delay={d(0)} />
      <View style={styles.gap10} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={72} borderRadius={16} delay={d(1)} />
        </View>
        <View style={styles.gap10h} />
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={72} borderRadius={16} delay={d(1)} />
        </View>
      </View>
      <View style={styles.gap10} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={72} borderRadius={16} delay={d(2)} />
        </View>
        <View style={styles.gap10h} />
        <View style={{ flex: 1 }}>
          <SkeletonBlock height={72} borderRadius={16} delay={d(2)} />
        </View>
      </View>
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="55%" borderRadius={6} delay={d(3)} />
      <View style={styles.gap12} />
      <SkeletonBlock height={88} borderRadius={18} delay={d(4)} />
      <View style={styles.gap10} />
      <SkeletonBlock height={88} borderRadius={18} delay={d(5)} />
      <View style={styles.gap10} />
      <SkeletonBlock height={88} borderRadius={18} delay={d(6)} />
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="50%" borderRadius={6} delay={d(7)} />
      <View style={styles.gap12} />
      <SkeletonBlock height={40} borderRadius={12} delay={d(8)} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} delay={d(9)} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} delay={d(10)} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} delay={d(11)} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} delay={d(12)} />
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="55%" borderRadius={6} delay={d(13)} />
      <View style={styles.gap12} />
      <SkeletonBlock height={80} borderRadius={14} delay={d(14)} />
      <View style={styles.gap10} />
      <SkeletonBlock height={80} borderRadius={14} delay={d(15)} />
      <View style={styles.gap10} />
      <SkeletonBlock height={80} borderRadius={14} delay={d(16)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
  },
  gap10: { height: 10 },
  gap10h: { width: 10 },
  gap8: { height: 8 },
  gap12: { height: 12 },
  gap20: { height: 20 },
});
