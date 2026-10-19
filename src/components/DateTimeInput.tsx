import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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

  const formatDate = (d: Date) =>
    d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (d: Date) =>
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

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
      <TouchableOpacity
        style={[styles.toggleRow, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
        onPress={() => onUseCustomDateChange(!useCustomDate)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: useCustomDate }}
        accessibilityLabel="Custom date and time"
        activeOpacity={0.8}
      >
        <View style={styles.toggleLeft}>
          <Ionicons name={useCustomDate ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
          <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Custom date & time</Text>
        </View>
      </TouchableOpacity>

      {useCustomDate && (
        <>
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
              onPress={() => setShowDate(true)}
              accessibilityRole="button"
              accessibilityLabel={`Select date, currently ${formatDate(date)}`}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.primary} />
              <Text style={[styles.pillText, { color: colors.textPrimary }]}>{formatDate(date)}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, { backgroundColor: colors.inputFill, borderColor: colors.border }]}
              onPress={() => setShowTime(true)}
              accessibilityRole="button"
              accessibilityLabel={`Select time, currently ${formatTime(date)}`}
              activeOpacity={0.8}
            >
              <Ionicons name="time-outline" size={18} color={colors.primary} />
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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  toggleLeft: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 14, fontWeight: '500', marginLeft: 8 },
});