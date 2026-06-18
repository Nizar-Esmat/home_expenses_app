import React, { useEffect, useRef, useCallback } from 'react';
import { View, Animated, StyleSheet, ViewStyle, Dimensions } from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

interface Props {
  height: number;
  width?: number | string;
  borderRadius?: number;
  style?: ViewStyle;
  delay?: number;
  shimmerSpeed?: number;
}

const SHIMMER_WIDTH = 140;
const DEFAULT_SPEED = 1600;

export default function SkeletonBlock({
  height,
  width: widthProp = '100%',
  borderRadius = 8,
  style,
  delay = 0,
  shimmerSpeed = DEFAULT_SPEED,
}: Props) {
  const { isDark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(-SHIMMER_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0.5)).current;

  const startAnimation = useCallback(() => {
    const toValue = typeof widthProp === 'number'
      ? widthProp + SHIMMER_WIDTH
      : Dimensions.get('window').width + SHIMMER_WIDTH;

    const shimmerSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue,
          duration: shimmerSpeed,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: -SHIMMER_WIDTH,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    const pulseSequence = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    shimmerSequence.start();
    pulseSequence.start();

    return () => {
      shimmerSequence.stop();
      pulseSequence.stop();
    };
  }, [shimmerAnim, opacityAnim, shimmerSpeed, widthProp]);

  useEffect(() => {
    let mounted = true;
    const timer = setTimeout(() => {
      if (mounted) {
        startAnimation();
      }
    }, delay);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [delay, startAnimation]);

  // Checkered mesh colors
  const baseColor = isDark ? '#1A1F2E' : '#E8ECF0';
  const altColor = isDark ? '#252B3D' : '#DEE2E8';

  return (
    <View style={[styles.container, { height, width: widthProp, borderRadius }, style]}>
      {/* Checkered mesh background (2x2 checkerboard) */}
      <View style={styles.meshContainer}>
        <View style={[styles.tile, { backgroundColor: baseColor }]} />
        <View style={[styles.tile, { backgroundColor: altColor }]} />
        <View style={[styles.tile, { backgroundColor: altColor }]} />
        <View style={[styles.tile, { backgroundColor: baseColor }]} />
      </View>

      {/* Shimmer gradient band - simulated with layered views */}
      <Animated.View
        style={[
          styles.shimmerContainer,
          {
            transform: [{ translateX: shimmerAnim }],
          },
        ]}
      >
        <View style={styles.shimmerBand} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  meshContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    width: '50%',
    height: '50%',
  },
  shimmerContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: SHIMMER_WIDTH,
    flexDirection: 'row',
  },
  shimmerBand: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
});
