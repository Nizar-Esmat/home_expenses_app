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
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        />
      )}
      <View style={[styles.fabGroup, { bottom: bottomOffset }]}>
        {open && (
          <>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.success }]}
              onPress={() => { setOpen(false); router.push('/add-income'); }}
            >
              <Ionicons name='trending-up-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}> Income</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.danger }]}
              onPress={() => { setOpen(false); router.push('/add-expense'); }}
            >
              <Ionicons name='trending-down-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}> Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: colors.primary }]}
              onPress={() => { setOpen(false); router.push('/transfer'); }}
            >
              <Ionicons name='swap-horizontal-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}> Transfer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fabMini, { backgroundColor: '#F59E0B' }]}
              onPress={() => { setOpen(false); router.push('/add-loan'); }}
            >
              <Ionicons name='cash-outline' size={20} color='#FFFFFF' />
              <Text style={styles.fabText}> Loan</Text>
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => setOpen((o) => !o)}
          activeOpacity={0.85}
        >
          <Ionicons
            name={open ? 'close' : 'add'}
            size={open ? 28 : 32}
            color='#FFFFFF'
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
    width: 110,
    height: 52,
    borderRadius: 30,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
