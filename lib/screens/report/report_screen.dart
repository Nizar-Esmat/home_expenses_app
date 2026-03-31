import 'package:flutter/material.dart';
import '../../core/helpers/currency_helper.dart';
import '../../core/helpers/date_helper.dart';
import '../../core/theme/app_theme.dart';
import '../../models/expense_model.dart';
import '../../models/settings_model.dart';
import '../../services/expense_service.dart';
import '../../services/settings_service.dart';
import '../../widgets/category_summary_tile.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/expense_tile.dart';
import '../expenses/add_expense_screen.dart';

class ReportScreen extends StatefulWidget {
  final String? monthKey;
  final String? monthLabel;

  const ReportScreen({super.key, this.monthKey, this.monthLabel});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final _expenseService = ExpenseService();
  final _settingsService = SettingsService();
  late final String _currentMonth;

  @override
  void initState() {
    super.initState();
    _currentMonth = widget.monthKey ?? DateHelper.getCurrentMonthKey();
  }

  void _openEditExpense(ExpenseModel expense) {
    Navigator.push(
      context,
      MaterialPageRoute(
          builder: (_) => AddExpenseScreen(expense: expense)),
    );
  }

  Future<void> _confirmDelete(ExpenseModel expense) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Expense'),
        content: Text(
          'Remove "${expense.category}" for '
          '${CurrencyHelper.format(expense.price, 'EGP')}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await _expenseService.deleteExpense(expense.id);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense deleted')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Monthly Report'),
            Text(
              widget.monthLabel ?? DateHelper.getCurrentMonthLabel(),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
      ),
      body: StreamBuilder<SettingsModel>(
        stream: _settingsService.getSettings(),
        builder: (context, settingsSnap) {
          final settings = settingsSnap.data ?? SettingsModel.defaults();

          return StreamBuilder<List<ExpenseModel>>(
            stream: _expenseService.getMonthExpenses(_currentMonth),
            builder: (context, expensesSnap) {
              if (expensesSnap.connectionState == ConnectionState.waiting &&
                  !expensesSnap.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final expenses = expensesSnap.data ?? [];

              if (expenses.isEmpty) {
                return const EmptyStateWidget(
                  emoji: '📊',
                  message:
                      'No expenses recorded this month.\nStart adding from the home screen.',
                );
              }

              final totalSpent =
                  expenses.fold(0.0, (sum, e) => sum + e.price);
              final remaining = settings.salary - totalSpent;
              final currency = settings.currency;

              // Group by category and sort largest-first
              final Map<String, double> categoryTotals = {};
              for (final e in expenses) {
                categoryTotals[e.category] =
                    (categoryTotals[e.category] ?? 0) + e.price;
              }
              final sortedCategories = categoryTotals.entries.toList()
                ..sort((a, b) => b.value.compareTo(a.value));

              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 40),
                children: [
                  // ── Summary Row ──────────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: _ReportSummaryBlock(
                          label: 'Total Spent',
                          value: CurrencyHelper.format(totalSpent, currency),
                          valueColor: AppTheme.danger,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: _ReportSummaryBlock(
                          label: remaining >= 0
                              ? 'Remaining'
                              : 'Over Budget',
                          value: CurrencyHelper.format(
                              remaining.abs(), currency),
                          valueColor: remaining >= 0
                              ? AppTheme.success
                              : AppTheme.danger,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 28),

                  // ── By Category ──────────────────────────────────
                  const Text(
                    'By Category',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      color: AppTheme.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...sortedCategories.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: CategorySummaryTile(
                        category: entry.key,
                        total: entry.value,
                        currency: currency,
                        percentage: totalSpent > 0
                            ? entry.value / totalSpent
                            : 0,
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // ── All Expenses ─────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'All Expenses',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      Text(
                        '${expenses.length} item${expenses.length == 1 ? '' : 's'}',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppTheme.textSecondary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ...expenses.map(
                    (e) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: ExpenseTile(
                        expense: e,
                        onEdit: () => _openEditExpense(e),
                        onDelete: () => _confirmDelete(e),
                      ),
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
    );
  }
}

class _ReportSummaryBlock extends StatelessWidget {
  final String label;
  final String value;
  final Color valueColor;

  const _ReportSummaryBlock({
    required this.label,
    required this.value,
    required this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 13,
              color: AppTheme.textSecondary,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: valueColor,
            ),
          ),
        ],
      ),
    );
  }
}
