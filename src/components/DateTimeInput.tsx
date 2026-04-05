import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@/theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  date: Date;
  onChange: (date: Date) => void;
  useCustomDate: boolean;
  onUseCustomDateChange: (value: boolean) => void;
}

export default function DateTimeInput({ date, onChange, useCustomDate, onUseCustomDateChange }: Props) {
  const { colors } = useTheme();
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);

  const formatDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const handleDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDate(false);
    if (selectedDate) {
      onChange(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), date.getHours(), date.getMinutes()));
    }
  };

  const handleTimeChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowTime(false);
    if (selectedDate) {
      onChange(new Date(date.getFullYear(), date.getMonth(), date.getDate(), selectedDate.getHours(), selectedDate.getMinutes()));
    }
  };

  return (
    <View>
      <View style={styles.toggleRow}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Custom date & time</Text>
        <Switch
          value={useCustomDate}
          onValueChange={onUseCustomDateChange}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor="#fff"
        />
      </View>

      {useCustomDate && (
        <>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
              onPress={() => setShowDate(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.pillText, { color: colors.textPrimary }]}>{formatDate(date)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
              onPress={() => setShowTime(true)}
            >
              <Ionicons name="time-outline" size={18} color={colors.textPrimary} />
              <Text style={[styles.pillText, { color: colors.textPrimary }]}>{formatTime(date)}</Text>
            </TouchableOpacity>
          </View>

          {showDate && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
            />
          )}
          {showTime && (
            <DateTimePicker
              value={date}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleTimeChange}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1.5 },
  pillText: { fontSize: 14, marginLeft: 8 },
});