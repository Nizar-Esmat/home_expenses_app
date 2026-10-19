import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, ViewStyle, DimensionValue, Easing } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  height: number;
  width?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  delay?: number;
}

export default function SkeletonBlock({
  height,
  width: widthProp = '100%',
  borderRadius = 8,
  style,
  delay = 0,
}: Props) {
  const { isDark } = useTheme();
  const pulseAnim = useRef(new Animated.Value(0.38)).current;

  useEffect(() => {
    let mounted = true;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.82,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.38,
          duration: 850,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (delay > 0) {
      timer = setTimeout(() => {
        if (mounted) {
          pulse.start();
        }
      }, delay);
    } else {
      pulse.start();
    }

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
      pulse.stop();
    };
  }, [pulseAnim, delay]);

  // Clean bone tokens: #27272A (zinc-800) in dark mode, #E2E8F0 (slate-200) in light mode
  const bg = isDark ? '#27272A' : '#E2E8F0';

  return (
    <Animated.View
      style={[
        styles.block,
        {
          height,
          width: widthProp,
          borderRadius,
          backgroundColor: bg,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: 'hidden',
  },
});
