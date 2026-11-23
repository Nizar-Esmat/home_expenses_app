import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  icon?: 'arrow-back' | 'close';
  onBack?: () => void;
  rightAction?: React.ReactNode;
  alignTitle?: 'center' | 'left';
  showDivider?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenHeader({
  title,
  subtitle,
  icon = 'arrow-back',
  onBack,
  rightAction,
  alignTitle = 'center',
  showDivider = true,
  style,
}: ScreenHeaderProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const isLeft = alignTitle === 'left';

  return (
    <View
      style={[
        styles.header,
        showDivider && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        style,
      ]}
    >
      <TouchableOpacity
        onPress={handleBack}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        style={styles.backBtn}
        accessibilityRole="button"
        accessibilityLabel={icon === 'close' ? 'Close' : 'Go back'}
      >
        <Ionicons
          name={icon}
          size={24}
          color={colors.textPrimary}
        />
      </TouchableOpacity>

      {isLeft ? (
        <View style={styles.leftTitleWrapper}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.centerTitleWrapper}>
          <Text
            style={[styles.title, { color: colors.textPrimary }]}
            numberOfLines={1}
            accessibilityRole="header"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      )}

      {rightAction ? (
        <View style={styles.rightActionWrapper}>{rightAction}</View>
      ) : (
        !isLeft && <View style={styles.spacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTitleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  leftTitleWrapper: {
    flex: 1,
    justifyContent: 'center',
    marginLeft: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '400',
    marginTop: 2,
  },
  rightActionWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 44,
  },
  spacer: {
    width: 44,
  },
});
