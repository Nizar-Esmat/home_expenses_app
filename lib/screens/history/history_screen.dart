import 'package:flutter/material.dart';
import '../../core/helpers/currency_helper.dart';
import '../../core/helpers/date_helper.dart';
import '../../core/theme/app_theme.dart';
import '../../models/month_summary.dart';
import '../../services/expense_service.dart';
import '../../widgets/empty_state_widget.dart';
import '../report/report_screen.dart';

class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  static const List<String> _monthEmojis = [
    '❄️', '💝', '🌸', '🌿', '☀️', '🏖️',
    '🌻', '🍂', '🍁', '🎃', '🌧️', '🎄',
  ];

  String _emojiFor(String monthKey) {
    final month = int.tryParse(monthKey.split('-')[1]) ?? 1;
    return _monthEmojis[(month - 1).clamp(0, 11)];
  }

  @override
  Widget build(BuildContext context) {
    final expenseService = ExpenseService();
    final currentMonth = DateHelper.getCurrentMonthKey();

    return Scaffold(
      appBar: AppBar(title: const Text('History')),
      body: StreamBuilder<List<MonthSummary>>(
        stream: expenseService.getMonthHistory(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting && !snap.hasData) {
            return const Center(child: CircularProgressIndicator());
          }

          final months = snap.data ?? [];

          if (months.isEmpty) {
            return const EmptyStateWidget(
              emoji: '📅',
              message:
                  'No history yet.\nYour past months will appear here automatically.',
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: months.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (context, index) {
              final summary = months[index];
              final isCurrent = summary.monthKey == currentMonth;
              final label = DateHelper.monthKeyToLabel(summary.monthKey);

              return InkWell(
                onTap: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ReportScreen(
                      monthKey: summary.monthKey,
                      monthLabel: label,
                    ),
                  ),
                ),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isCurrent ? AppTheme.primary : AppTheme.border,
                      width: isCurrent ? 1.5 : 1,
                    ),
                  ),
                  child: Row(
                    children: [
                      // Month icon
                      Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: isCurrent
                              ? AppTheme.primaryLight
                              : AppTheme.inputFill,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Center(
                          child: Text(
                            _emojiFor(summary.monthKey),
                            style: const TextStyle(fontSize: 22),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),

                      // Month name + count
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(
                                  label,
                                  style: const TextStyle(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppTheme.textPrimary,
                                  ),
                                ),
                                if (isCurrent) ...[
                                  const SizedBox(width: 8),
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppTheme.primaryLight,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: const Text(
                                      'Current',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w600,
                                        color: AppTheme.primary,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            const SizedBox(height: 3),
                            Text(
                              '${summary.count} expense${summary.count == 1 ? '' : 's'}',
                              style: const TextStyle(
                                fontSize: 13,
                                color: AppTheme.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Total + chevron
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            CurrencyHelper.format(summary.totalSpent),
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                              color: AppTheme.danger,
                            ),
                          ),
                          const SizedBox(height: 2),
                          const Text(
                            'spent',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: AppTheme.textSecondary,
                        size: 20,
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
