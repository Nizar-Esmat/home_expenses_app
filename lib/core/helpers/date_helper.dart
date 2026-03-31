import 'package:intl/intl.dart';

class DateHelper {
  static String getMonthKey(DateTime date) {
    return DateFormat('yyyy-MM').format(date);
  }

  static String getCurrentMonthKey() {
    return getMonthKey(DateTime.now());
  }

  static String formatDate(DateTime date) {
    return DateFormat('MMM d, yyyy').format(date);
  }

  static String formatDateTime(DateTime date) {
    return DateFormat('MMM d, yyyy · h:mm a').format(date);
  }

  static String formatMonthYear(DateTime date) {
    return DateFormat('MMMM yyyy').format(date);
  }

  static String getCurrentMonthLabel() {
    return formatMonthYear(DateTime.now());
  }

  /// Converts a monthKey like "2026-03" → "March 2026".
  static String monthKeyToLabel(String monthKey) {
    final parts = monthKey.split('-');
    final date = DateTime(int.parse(parts[0]), int.parse(parts[1]));
    return formatMonthYear(date);
  }
}
