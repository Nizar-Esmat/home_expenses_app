import 'package:flutter/material.dart';
import '../../core/helpers/currency_helper.dart';
import '../../core/helpers/date_helper.dart';
import '../../core/theme/app_theme.dart';
import '../../models/expense_model.dart';
import '../../models/settings_model.dart';
import '../../services/expense_service.dart';
import '../../services/settings_service.dart';
import '../../widgets/empty_state_widget.dart';
import '../../widgets/expense_tile.dart';
import '../../widgets/summary_card.dart';
import '../expenses/add_expense_screen.dart';
import '../history/history_screen.dart';
import '../report/report_screen.dart';
import '../settings/settings_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _expenseService = ExpenseService();
  final _settingsService = SettingsService();
  late final String _currentMonth;

  @override
  void initState() {
    super.initState();
    _currentMonth = DateHelper.getCurrentMonthKey();
  }

  void _openAddExpense() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const AddExpenseScreen()),
    );
  }

  void _openReport() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const ReportScreen()),
    );
  }

  void _openSettings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SettingsScreen()),
    );
  }

  void _openHistory() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const HistoryScreen()),
    );
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
            const Text('BudgetBuddy'),
            Text(
              DateHelper.getCurrentMonthLabel(),
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w400,
                color: AppTheme.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.history_rounded),
            onPressed: _openHistory,
            tooltip: 'History',
          ),
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: _openSettings,
            tooltip: 'Settings',
          ),
        ],
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

              if (expensesSnap.hasError) {
                return Center(
                  child: Text(
                    'Failed to load expenses.\n${expensesSnap.error}',
                    textAlign: TextAlign.center,
                    style: const TextStyle(color: AppTheme.textSecondary),
                  ),
                );
              }

              final expenses = expensesSnap.data ?? [];
              final totalSpent =
                  expenses.fold(0.0, (sum, e) => sum + e.price);
              final remaining = settings.salary - totalSpent;
              final progress = settings.salary > 0
                  ? (totalSpent / settings.salary).clamp(0.0, 1.0)
                  : 0.0;

              return ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 100),
                children: [
                  // ── Salary missing warning ─────────────────────
                  if (settings.salary == 0) ...[
                    _SalaryWarningBanner(onSetTap: _openSettings),
                    const SizedBox(height: 16),
                  ],

                  // ── Summary Cards ──────────────────────────────
                  Row(
                    children: [
                      Expanded(
                        child: SummaryCard(
                          title: 'Salary',
                          value: settings.salary > 0
                              ? CurrencyHelper.format(
                                  settings.salary, settings.currency)
                              : 'Not set',
                          icon: Icons.account_balance_wallet_outlined,
                          iconColor: AppTheme.primary,
                          backgroundColor: AppTheme.primaryLight,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: SummaryCard(
                          title: 'Spent',
                          value: CurrencyHelper.format(
                              totalSpent, settings.currency),
                          icon: Icons.arrow_upward_rounded,
                          iconColor: AppTheme.danger,
                          backgroundColor: AppTheme.dangerBg,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  SummaryCard(
                    title: 'Remaining',
                    value: CurrencyHelper.format(remaining, settings.currency),
                    icon: remaining >= 0
                        ? Icons.savings_outlined
                        : Icons.warning_amber_outlined,
                    iconColor:
                        remaining >= 0 ? AppTheme.success : AppTheme.danger,
                    backgroundColor:
                        remaining >= 0 ? AppTheme.successBg : AppTheme.dangerBg,
                    isFullWidth: true,
                  ),

                  // ── Progress Bar ───────────────────────────────
                  const SizedBox(height: 16),
                  _BudgetProgressBar(
                      progress: progress as double,
                      overBudget: remaining < 0),

                  // ── Recent Expenses ────────────────────────────
                  const SizedBox(height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Recent Expenses',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                      TextButton(
                        onPressed: _openReport,
                        child: const Text('View Report'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (expenses.isEmpty)
                    const EmptyStateWidget(
                      emoji: '💸',
                      message:
                          'No expenses added this month.\nTap + to record your first one.',
                    )
                  else
                    ...expenses
                        .take(10)
                        .map((e) => Padding(
                              padding: const EdgeInsets.only(bottom: 8),
                              child: ExpenseTile(
                                expense: e,
                                onEdit: () => _openEditExpense(e),
                                onDelete: () => _confirmDelete(e),
                              ),
                            )),
                ],
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddExpense,
        icon: const Icon(Icons.add),
        label: const Text('Add Expense'),
      ),
    );
  }
}

// ── Helper widgets local to home screen ─────────────────────────────────────

class _SalaryWarningBanner extends StatelessWidget {
  final VoidCallback onSetTap;
  const _SalaryWarningBanner({required this.onSetTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppTheme.warningBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.warning.withAlpha(80)),
      ),
      child: Row(
        children: [
          const Icon(Icons.info_outline, color: AppTheme.warning, size: 20),
          const SizedBox(width: 10),
          const Expanded(
            child: Text(
              'Set your monthly salary to track your budget.',
              style: TextStyle(color: AppTheme.warning, fontSize: 13),
            ),
          ),
          TextButton(
            onPressed: onSetTap,
            style: TextButton.styleFrom(
              minimumSize: Size.zero,
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: const Text('Set Now'),
          ),
        ],
      ),
    );
  }
}

class _BudgetProgressBar extends StatelessWidget {
  final double progress;
  final bool overBudget;

  const _BudgetProgressBar(
      {required this.progress, required this.overBudget});

  @override
  Widget build(BuildContext context) {
    final barColor = overBudget ? AppTheme.danger : AppTheme.primary;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Budget Used',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: AppTheme.textSecondary,
              ),
            ),
            Text(
              '${(progress * 100).toStringAsFixed(1)}%',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: overBudget ? AppTheme.danger : AppTheme.textPrimary,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 10,
            backgroundColor: AppTheme.border,
            valueColor: AlwaysStoppedAnimation<Color>(barColor),
          ),
        ),
      ],
    );
  }
}
