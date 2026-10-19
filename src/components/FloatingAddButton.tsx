import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { useRouter } from 'expo-router';

interface Props {
  bottomOffset?: number;
}

export default function FloatingAddButton({ bottomOffset = 92 }: Props) {
  const { colors } = useTheme();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && (
        <TouchableOpacity
          style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}
          activeOpacity={1}
          onPress={() => setOpen(false)}
          accessibilityRole="button"
          accessibilityLabel="Dismiss quick actions menu"
        />
      )}
      <View style={[styles.fabGroup, { bottom: bottomOffset }]}>
        {open && (
          <>
            {/* 4. Loan (topmost) */}
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.warning }]}
              onPress={() => { setOpen(false); router.push('/add-loan'); }}
              accessibilityRole="button"
              accessibilityLabel="Add loan"
            >
              <Ionicons name='cash-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}>Loan</Text>
            </TouchableOpacity>

            {/* 3. Transfer */}
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.primary }]}
              onPress={() => { setOpen(false); router.push('/transfer'); }}
              accessibilityRole="button"
              accessibilityLabel="Transfer between accounts"
            >
              <Ionicons name='swap-horizontal-outline' size={20} color={colors.onPrimary} />
              <Text style={[styles.fabText, { color: colors.onPrimary }]}>Transfer</Text>
            </TouchableOpacity>

            {/* 2. Income */}
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.success }]}
              onPress={() => { setOpen(false); router.push('/add-income'); }}
              accessibilityRole="button"
              accessibilityLabel="Add income"
            >
              <Ionicons name='trending-up-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}>Income</Text>
            </TouchableOpacity>

            {/* 1. Expense (closest to thumb!) */}
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.danger }]}
              onPress={() => { setOpen(false); router.push('/add-expense'); }}
              accessibilityRole="button"
              accessibilityLabel="Add expense"
            >
              <Ionicons name='trending-down-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}>Expense</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setOpen((o) => !o)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={open ? 'Close quick actions menu' : 'Open quick actions menu'}
          accessibilityState={{ expanded: open }}
        >
          <Ionicons
            name={open ? 'close' : 'add'}
            size={open ? 28 : 32}
            color={colors.onPrimary}
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  fabGroup: {
    position: 'absolute',
    right: 24,
    alignItems: 'flex-end',
    zIndex: 2,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabMini: {
    minWidth: 116,
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
