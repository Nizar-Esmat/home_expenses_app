import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

export default function StatisticsLoadingSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? '#1A1F2E' : '#E2E8F0';

  return (
    <View style={styles.container}>
      <SkeletonBlock height={148} borderRadius={22} bg={bg} />
      <View style={styles.gap10} />
      <View style={styles.row}>
        <SkeletonBlock height={72} borderRadius={16} bg={bg} />
        <View style={styles.gap10h} />
        <SkeletonBlock height={72} borderRadius={16} bg={bg} />
      </View>
      <View style={styles.row}>
        <SkeletonBlock height={72} borderRadius={16} bg={bg} />
        <View style={styles.gap10h} />
        <SkeletonBlock height={72} borderRadius={16} bg={bg} />
      </View>
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="55%" borderRadius={6} bg={bg} />
      <View style={styles.gap12} />
      <SkeletonBlock height={88} borderRadius={18} bg={bg} />
      <View style={styles.gap10} />
      <SkeletonBlock height={88} borderRadius={18} bg={bg} />
      <View style={styles.gap10} />
      <SkeletonBlock height={88} borderRadius={18} bg={bg} />
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="50%" borderRadius={6} bg={bg} />
      <View style={styles.gap12} />
      <SkeletonBlock height={40} borderRadius={12} bg={bg} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} bg={bg} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} bg={bg} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} bg={bg} />
      <View style={styles.gap8} />
      <SkeletonBlock height={40} borderRadius={12} bg={bg} />
      <View style={styles.gap20} />
      <SkeletonBlock height={18} width="55%" borderRadius={6} bg={bg} />
      <View style={styles.gap12} />
      <SkeletonBlock height={80} borderRadius={14} bg={bg} />
      <View style={styles.gap10} />
      <SkeletonBlock height={80} borderRadius={14} bg={bg} />
      <View style={styles.gap10} />
      <SkeletonBlock height={80} borderRadius={14} bg={bg} />
    </View>
  );
}

function SkeletonBlock({
  height,
  width,
  borderRadius,
  bg,
}: {
  height: number;
  width?: string;
  borderRadius: number;
  bg: string;
}) {
  return (
    <View
      style={[
        styles.block,
        {
          height,
          width: width ? (width as any) : '100%',
          borderRadius,
          backgroundColor: bg,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  block: {
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  gap10: { height: 10 },
  gap10h: { width: 10 },
  gap8: { height: 8 },
  gap12: { height: 12 },
  gap20: { height: 20 },
});
