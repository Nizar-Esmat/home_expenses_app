import React from 'react';
import { Dimensions } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { getTabSlideDirection } from '@/utils/tabAnimation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  children: React.ReactNode;
}

export default function TabSlideWrapper({ children }: Props) {
  const translateX = useSharedValue(0);
  const isFirstFocus = React.useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      if (isFirstFocus.current) {
        isFirstFocus.current = false;
        return;
      }

      const direction = getTabSlideDirection();
      if (direction === null) return;

      translateX.value =
        direction === 'right' ? SCREEN_WIDTH * 0.15 : -SCREEN_WIDTH * 0.15;
      translateX.value = withTiming(0, {
        duration: 320,
        easing: Easing.out(Easing.cubic),
      });
    }, [translateX]),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={[{ flex: 1 }, animatedStyle]}>
      {children}
    </Animated.View>
  );
}
