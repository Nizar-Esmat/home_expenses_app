import React, {
  createContext, useCallback, useContext, useRef, useState,
} from 'react';
import {
  Animated, Modal, StyleSheet, Text, TouchableOpacity,
  TouchableWithoutFeedback, View,
} from 'react-native';
import { useTheme } from '@/theme/ThemeContext';

// ── Types ────────────────────────────────────────────────────────

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
}

export interface DialogOptions {
  title: string;
  message?: string;
  /** Emoji shown in the icon circle at the top of the card */
  icon?: string;
  /** Controls the accent color of the icon circle and card top border */
  type?: 'info' | 'success' | 'warning' | 'danger';
  buttons?: DialogButton[];
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
}

const DialogContext = createContext<DialogContextValue>({ showDialog: () => {} });

// ── Provider ─────────────────────────────────────────────────────

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();

  const [visible, setCurrent] = useState<DialogOptions | null>(null);
  const scaleAnim = useRef(new Animated.Value(0.86)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const bgAnim    = useRef(new Animated.Value(0)).current;

  const showDialog = useCallback((opts: DialogOptions) => {
    scaleAnim.setValue(0.86);
    fadeAnim.setValue(0);
    bgAnim.setValue(0);
    setCurrent(opts);

    Animated.parallel([
      Animated.timing(bgAnim, {
        toValue: 1, duration: 240, useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1, tension: 68, friction: 9, useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1, duration: 210, useNativeDriver: true,
      }),
    ]).start();
  }, [bgAnim, fadeAnim, scaleAnim]);

  const dismiss = useCallback((onDone?: () => void) => {
    Animated.parallel([
      Animated.timing(bgAnim,    { toValue: 0, duration: 170, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.92, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      setCurrent(null);
      onDone?.();
    });
  }, [bgAnim, fadeAnim, scaleAnim]);

  const handlePress = (btn: DialogButton) => {
    dismiss(() => btn.onPress?.());
  };

  const typeAccent: Record<string, { bg: string; border: string }> = {
    danger:  { bg: colors.danger  + '20', border: colors.danger  },
    warning: { bg: '#F59E0B20',           border: '#F59E0B'       },
    success: { bg: colors.success + '20', border: colors.success  },
    info:    { bg: colors.primary + '20', border: colors.primary  },
  };

  const current = visible;
  const buttons = current?.buttons ?? [{ text: 'OK', style: 'default' as const }];
  const accent  = typeAccent[current?.type ?? 'info'];
  const isStack = buttons.length > 2;

  return (
    <DialogContext.Provider value={{ showDialog }}>
      {children}
      <Modal
        visible={current !== null}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => dismiss()}
      >
        {/* Dimmed backdrop — tapping it dismisses */}
        <TouchableWithoutFeedback onPress={() => dismiss()}>
          <Animated.View style={[styles.backdrop, { opacity: bgAnim }]} />
        </TouchableWithoutFeedback>

        {/* Centered card */}
        <View style={styles.overlay} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderTopColor: accent.border,
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Icon circle */}
            {current?.icon ? (
              <View style={[styles.iconWrap, { backgroundColor: accent.bg }]}>
                <Text style={styles.iconEmoji}>{current.icon}</Text>
              </View>
            ) : null}

            {/* Title */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {current?.title}
            </Text>

            {/* Message */}
            {current?.message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {current.message}
              </Text>
            ) : null}

            {/* Separator */}
            <View style={[styles.separator, { backgroundColor: colors.border }]} />

            {/* Buttons */}
            <View style={[styles.btnRow, isStack && styles.btnColumn]}>
              {buttons.map((btn, i) => {
                const isCancel  = btn.style === 'cancel';
                const isDanger  = btn.style === 'destructive';
                const isPrimary = !isCancel && !isDanger;

                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handlePress(btn)}
                    activeOpacity={0.72}
                    style={[
                      styles.btn,
                      !isStack && buttons.length === 2 && styles.btnHalf,
                      (isStack || buttons.length === 1) && styles.btnFull,
                      isCancel  && { backgroundColor: colors.inputFill },
                      isDanger  && { backgroundColor: colors.danger + '18' },
                      isPrimary && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.btnText,
                        isCancel  && { color: colors.textSecondary, fontWeight: '600' },
                        isDanger  && { color: colors.danger,        fontWeight: '700' },
                        isPrimary && { color: '#fff',               fontWeight: '700' },
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────────

export function useAppDialog() {
  return useContext(DialogContext);
}

// ── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderTopWidth: 3,
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  iconEmoji: { fontSize: 30 },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 2,
  },
  separator: {
    height: 1,
    marginHorizontal: -24,
    marginVertical: 18,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnColumn: {
    flexDirection: 'column',
    gap: 8,
  },
  btn: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnHalf: { flex: 1 },
  btnFull: { width: '100%' },
  btnText: { fontSize: 15 },
});
