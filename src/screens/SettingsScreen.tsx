import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { COLOR_PALETTES, ColorPaletteName, PALETTE_COLORS, PALETTE_COLORS_DARK } from '@/theme/colors';
import { saveSettings } from '@/services/database';
import AppButton from '@/components/AppButton';

const PALETTES = Object.keys(COLOR_PALETTES) as ColorPaletteName[];

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme, colorPalette, changeColorPalette } = useTheme();
  const router = useRouter();

  const ringColor = isDark ? '#FFFFFF' : '#374151';

  const [saving, setSaving] = useState(false);

  const saveAll = async () => {
    setSaving(true);
    await saveSettings({ currency: 'EGP' });
    setSaving(false);
    router.back();
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
        
        {/* Color Palette */}
        <View style={styles.paletteGrid}>
          {PALETTES.map((p) => {
            const selected = colorPalette === p;
            const color = isDark ? PALETTE_COLORS_DARK[p] : PALETTE_COLORS[p];
            return (
              <TouchableOpacity
                key={p}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selected && { borderColor: ringColor, borderWidth: 3 },
                ]}
                onPress={() => changeColorPalette(p)}
                activeOpacity={0.7}
              >
                {selected && (
                  <View style={[styles.checkmark, { backgroundColor: color }]}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Dark Mode */}
        <View style={[styles.navRow, { backgroundColor: colors.card }]}>
          <View style={styles.navRowLeft}>
            <View style={[styles.navIcon, { backgroundColor: colors.primary + '33' }]}>
              <Ionicons name="moon-outline" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.navLabel, { color: colors.textPrimary }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.background}
          />
        </View>

        {/* Categories */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>CATEGORIES</Text>
        <TouchableOpacity
          style={[styles.navRow, { backgroundColor: colors.card }]}
          onPress={() => router.push('/categories')}
          activeOpacity={0.75}
        >
          <View style={styles.navRowLeft}>
            <View style={[styles.navIcon, { backgroundColor: colors.primary + '33' }]}>
              <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.navLabel, { color: colors.textPrimary }]}>Expense Categories</Text>
              <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                Add, edit & organise expense categories
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navRow, { backgroundColor: colors.card }]}
          onPress={() => router.push('/income-categories')}
          activeOpacity={0.75}
        >
          <View style={styles.navRowLeft}>
            <View style={[styles.navIcon, { backgroundColor: colors.primary + '33' }]}>
              <Ionicons name="cash-outline" size={16} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.navLabel, { color: colors.textPrimary }]}>Income Categories</Text>
              <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                Add, edit & organise income categories
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <AppButton label="Save Settings" onPress={saveAll} loading={saving} />
        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '700' },
  content: { padding: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 14, marginTop: 6 },
  paletteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  colorCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, marginBottom: 10,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  navIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navSub: { fontSize: 12, marginTop: 2 },
});