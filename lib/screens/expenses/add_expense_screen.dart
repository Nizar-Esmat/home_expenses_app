import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../models/expense_model.dart';
import '../../services/expense_service.dart';
import '../../services/settings_service.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/primary_text_field.dart';

class AddExpenseScreen extends StatefulWidget {
  final ExpenseModel? expense;

  const AddExpenseScreen({super.key, this.expense});

  @override
  State<AddExpenseScreen> createState() => _AddExpenseScreenState();
}

class _AddExpenseScreenState extends State<AddExpenseScreen> {
  final _formKey = GlobalKey<FormState>();
  final _priceController = TextEditingController();
  final _noteController = TextEditingController();
  final _expenseService = ExpenseService();
  final _settingsService = SettingsService();

  late Future<List<String>> _categoriesFuture;
  String _selectedCategory = AppConstants.categories.first;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _categoriesFuture = _loadCategories();
    if (widget.expense != null) {
      _priceController.text = widget.expense!.price.toStringAsFixed(2);
      _noteController.text = widget.expense!.note ?? '';
      _selectedCategory = widget.expense!.category;
    }
  }

  Future<List<String>> _loadCategories() async {
    final settings = await _settingsService.getSettings().first;
    return [...AppConstants.categories, ...settings.customCategories];
  }

  @override
  void dispose() {
    _priceController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isLoading = true);
    try {
      final price =
          double.parse(_priceController.text.trim().replaceAll(',', '.'));
      final note = _noteController.text.trim().isEmpty
          ? null
          : _noteController.text.trim();
      if (widget.expense != null) {
        await _expenseService.updateExpense(
          expenseId: widget.expense!.id,
          price: price,
          category: _selectedCategory,
          note: note,
        );
      } else {
        await _expenseService.addExpense(
          price: price,
          category: _selectedCategory,
          note: note,
        );
      }
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
                widget.expense != null ? 'Expense updated ✓' : 'Expense added ✓'),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to save. Please try again.'),
            backgroundColor: AppTheme.danger,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.expense != null ? 'Edit Expense' : 'Add Expense'),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Amount ────────────────────────────────────────
                PrimaryTextField(
                  label: 'Amount',
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(
                      decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter an amount';
                    }
                    final v = double.tryParse(
                        value.trim().replaceAll(',', '.'));
                    if (v == null || v <= 0) {
                      return 'Please enter a valid amount greater than 0';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),

                // ── Category ──────────────────────────────────────
                const Text(
                  'Category',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppTheme.textPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                FutureBuilder<List<String>>(
                  future: _categoriesFuture,
                  builder: (context, snap) {
                    final categories = snap.data ?? AppConstants.categories;
                    // Ensure selected category is valid in current list
                    if (!categories.contains(_selectedCategory)) {
                      WidgetsBinding.instance.addPostFrameCallback((_) {
                        if (mounted) {
                          setState(() => _selectedCategory = categories.first);
                        }
                      });
                    }
                    return Wrap(
                      spacing: 10,
                      runSpacing: 10,
                      children: categories.map((cat) {
                        final selected = cat == _selectedCategory;
                        final emoji =
                            AppConstants.categoryIcons[cat] ?? '📌';
                        return GestureDetector(
                          onTap: () =>
                              setState(() => _selectedCategory = cat),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 150),
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: selected
                                  ? AppTheme.primary
                                  : AppTheme.inputFill,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: selected
                                    ? AppTheme.primary
                                    : AppTheme.border,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(emoji,
                                    style: const TextStyle(fontSize: 16)),
                                const SizedBox(width: 6),
                                Text(
                                  cat,
                                  style: TextStyle(
                                    color: selected
                                        ? Colors.white
                                        : AppTheme.textPrimary,
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }).toList(),
                    );
                  },
                ),
                const SizedBox(height: 24),

                // ── Note (optional) ───────────────────────────────
                PrimaryTextField(
                  label: 'Note (optional)',
                  controller: _noteController,
                  textInputAction: TextInputAction.done,
                  maxLines: 2,
                ),
                const SizedBox(height: 36),

                PrimaryButton(
                  label: widget.expense != null ? 'Update Expense' : 'Save Expense',
                  onPressed: _save,
                  isLoading: _isLoading,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
