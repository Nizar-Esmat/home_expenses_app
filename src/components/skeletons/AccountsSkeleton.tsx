import React from 'react';
import { View, StyleSheet } from 'react-native';
import SkeletonBlock from '../SkeletonBlock';

export default function AccountsSkeleton() {
  const d = (i: number) => i * 80;

  return (
    <View style={[styles.container]}>
      <SkeletonBlock height={130} borderRadius={16} delay={d(0)} />
      <SkeletonBlock height={60} borderRadius={12} delay={d(1)} />
      <SkeletonBlock height={60} borderRadius={12} delay={d(2)} />
      <SkeletonBlock height={60} borderRadius={12} delay={d(3)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
});
