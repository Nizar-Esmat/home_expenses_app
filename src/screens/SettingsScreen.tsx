import React, { useCallback, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeContext';
import { getSettings, saveSettings } from '@/services/database';
import { CURRENCY_OPTIONS } from '@/services/constants';
import { Settings } from '@/types';
import AppButton from '@/components/AppButton';

export default function SettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const router = useRouter();

  const [currency, setCurrency] = useState('EGP');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    getSettings().then((s: Settings) => setCurrency(s.currency ?? 'EGP'));
  }, []);

  useFocusEffect(load);

  const saveAll = async () => {
    setSaving(true);
    await saveSettings({ currency });
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

        {/* Currency */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CURRENCY</Text>
        <View style={styles.currencyRow}>
          {CURRENCY_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[
                styles.currencyPill,
                {
                  backgroundColor: currency === c ? colors.primary : colors.inputFill,
                  borderColor: currency === c ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCurrency(c)}
            >
              <Text style={[styles.currencyText, { color: currency === c ? colors.background : colors.textPrimary }]}>
                {c}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Appearance */}
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>APPEARANCE</Text>
        <View style={[styles.navRow, { backgroundColor: colors.card }]}>
          <View style={styles.navRowLeft}>
            <View style={[styles.navIcon, { backgroundColor: '#285A48' }]}>
              <Ionicons name="moon-outline" size={16} color="#B0E4CC" />
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
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>CATEGORIES</Text>
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
              <Text style={[styles.navLabel, { color: colors.textPrimary }]}>Manage Categories</Text>
              <Text style={[styles.navSub, { color: colors.textSecondary }]}>
                Add, edit & organise expense categories
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
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginTop: 6 },
  currencyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  currencyPill: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  currencyText: { fontSize: 14, fontWeight: '600' },
  navRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: 14, marginBottom: 10,
  },
  navRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  navIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  navLabel: { fontSize: 15, fontWeight: '600' },
  navSub: { fontSize: 12, marginTop: 2 },
});
