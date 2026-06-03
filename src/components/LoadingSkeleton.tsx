import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

const COLORS = {
  cardBg: '#101827',
  cardBorder: '#263247',
  primaryText: '#F8FAFC',
  secondaryText: '#AAB2C0',
  accent: '#10B981',
};

export default function LoadingSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <SkeletonBlock height={136} borderRadius={24} />
      <View style={{ height: 24 }} />
      <SkeletonBlock height={32} width="60%" borderRadius={6} />
      <View style={{ height: 8 }} />
      <SkeletonBlock height={20} width="80%" borderRadius={6} />
      <View style={{ height: 12 }} />
      <SkeletonBlock height={240} borderRadius={20} />
      <View style={{ height: 24 }} />
      <SkeletonBlock height={32} width="60%" borderRadius={6} />
      <View style={{ height: 12 }} />
      <SkeletonBlock height={148} borderRadius={20} />
      <View style={{ height: 12 }} />
      <SkeletonBlock height={44} borderRadius={14} />
      <View style={{ height: 24 }} />
      <SkeletonBlock height={32} width="60%" borderRadius={6} />
      <View style={{ height: 8 }} />
      <SkeletonBlock height={20} width="50%" borderRadius={6} />
      <View style={{ height: 12 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={{ marginBottom: 12 }}>
          <SkeletonBlock height={84} borderRadius={18} />
        </View>
      ))}
    </View>
  );
}

function SkeletonBlock({
  height,
  width,
  borderRadius,
}: {
  height: number;
  width?: string;
  borderRadius: number;
}) {
  const { isDark } = useTheme();
  const bg = isDark ? '#1A1F2E' : '#E2E8F0';
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
  container: { paddingHorizontal: 20, paddingTop: 20 },
  block: { opacity: 0.6 },
});