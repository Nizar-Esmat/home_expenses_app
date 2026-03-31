import 'package:intl/intl.dart';

class CurrencyHelper {
  static final _formatter = NumberFormat('#,##0.00', 'en_US');

  /// Formats [amount] as Egyptian Pounds.
  static String format(double amount, [String? _]) {
    return 'EGP ${_formatter.format(amount)}';
  }
}
