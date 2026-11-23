import React from 'react';
import {
  EmojiKeyboard,
  EmojiModal,
  type EmojiType,
  type Theme,
  type RecursivePartial,
} from '@softwhere-uz/react-native-emoji-keyboard';
import { useTheme } from '@/theme/ThemeContext';

interface AppEmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
}

export function getEmojiKeyboardTheme(
  colors: ReturnType<typeof useTheme>['colors'],
): RecursivePartial<Theme> {
  return {
    backdrop: '#00000077',
    knob: colors.border,
    container: colors.card,
    header: colors.textPrimary,
    skinTonesContainer: colors.inputFill,
    category: {
      icon: colors.textSecondary,
      iconActive: colors.primary,
      container: 'transparent',
      containerActive: colors.primary + '22',
    },
    search: {
      background: colors.inputFill,
      text: colors.textPrimary,
      placeholder: colors.textSecondary,
      icon: colors.textSecondary,
    },
  };
}

export default function AppEmojiPicker({ open, onClose, onSelect }: AppEmojiPickerProps) {
  const { colors, isDark } = useTheme();

  return (
    <EmojiModal
      open={open}
      onClose={onClose}
      colorScheme={isDark ? 'dark' : 'light'}
      height="65%"
      theme={getEmojiKeyboardTheme(colors)}
      closeOnBackdropPress
    >
      <EmojiKeyboard
        onEmojiSelected={(emojiObject: EmojiType) => {
          onSelect(emojiObject.emoji);
          onClose();
        }}
        enableSearchBar
        enableRecentlyUsed
        categoryPosition="top"
        defaultHeight="100%"
        theme={getEmojiKeyboardTheme(colors)}
      />
    </EmojiModal>
  );
}
