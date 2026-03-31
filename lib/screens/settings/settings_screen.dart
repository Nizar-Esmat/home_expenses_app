import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_constants.dart';
import '../../core/theme/app_theme.dart';
import '../../models/settings_model.dart';
import '../../services/auth_service.dart';
import '../../services/settings_service.dart';
import '../../widgets/primary_button.dart';
import '../../widgets/primary_text_field.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _salaryController = TextEditingController();
  final _newCategoryController = TextEditingController();
  final _settingsService = SettingsService();
  final _authService = AuthService();

  List<String> _customCategories = [];
  bool _isLoadingSettings = true;
  bool _isSaving = false;
  bool _isSavingCategory = false;

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    try {
      final settings = await _settingsService.getSettings().first;
      if (mounted) {
        setState(() {
          if (settings.salary > 0) {
            _salaryController.text = settings.salary.toStringAsFixed(2);
          }
          _customCategories = List<String>.from(settings.customCategories);
          _isLoadingSettings = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _isLoadingSettings = false);
    }
  }

  Future<void> _saveSalary() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSaving = true);
    try {
      final salary = double.parse(
          _salaryController.text.trim().replaceAll(',', '.'));
      await _settingsService.saveSettings(
        SettingsModel(
          salary: salary,
          currency: 'EGP',
          customCategories: _customCategories,
        ),
      );
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(const SnackBar(content: Text('Settings saved ✓')));
        Navigator.pop(context);
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Failed to save settings. Please try again.'),
          backgroundColor: AppTheme.danger,
        ));
      }
    } finally {
      if (mounted) setState(() => _isSaving = false);
    }
  }

  Future<void> _addCategory() async {
    final name = _newCategoryController.text.trim();
    if (name.isEmpty) return;

    // Check for duplicates (case-insensitive)
    final all = [...AppConstants.categories, ..._customCategories];
    if (all.any((c) => c.toLowerCase() == name.toLowerCase())) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This category already exists.'),
          backgroundColor: AppTheme.warning,
        ),
      );
      return;
    }

    setState(() {
      _isSavingCategory = true;
      _customCategories = [..._customCategories, name];
      _newCategoryController.clear();
    });
    try {
      final current = await _settingsService.getSettings().first;
      await _settingsService.saveSettings(
          current.copyWith(customCategories: _customCategories));
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Failed to save category.'),
          backgroundColor: AppTheme.danger,
        ));
      }
    } finally {
      if (mounted) setState(() => _isSavingCategory = false);
    }
  }

  Future<void> _deleteCategory(String category) async {
    setState(() {
      _customCategories =
          _customCategories.where((c) => c != category).toList();
    });
    try {
      final current = await _settingsService.getSettings().first;
      await _settingsService.saveSettings(
          current.copyWith(customCategories: _customCategories));
    } catch (_) {
      // Revert on failure
      if (mounted) {
        setState(() => _customCategories = [..._customCategories, category]);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
          content: Text('Failed to delete category.'),
          backgroundColor: AppTheme.danger,
        ));
      }
    }
  }

  Future<void> _confirmSignOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out?'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: AppTheme.danger),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );
    if (confirmed == true) await _authService.signOut();
  }

  @override
  void dispose() {
    _salaryController.dispose();
    _newCategoryController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingSettings) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded),
            onPressed: _confirmSignOut,
            tooltip: 'Sign Out',
          ),
        ],
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // ── Salary ─────────────────────────────────────
                const Text('Budget',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary)),
                const SizedBox(height: 16),
                PrimaryTextField(
                  label: 'Monthly Salary (EGP)',
                  controller: _salaryController,
                  keyboardType:
                      const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.,]')),
                  ],
                  textInputAction: TextInputAction.done,
                  validator: (value) {
                    if (value == null || value.trim().isEmpty) {
                      return 'Please enter your monthly salary';
                    }
                    final v = double.tryParse(
                        value.trim().replaceAll(',', '.'));
                    if (v == null || v < 0) {
                      return 'Please enter a valid positive amount';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                const Text(
                  'Currency is set to Egyptian Pound (EGP)',
                  style: TextStyle(
                      fontSize: 13, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 32),

                // ── Categories ────────────────────────────────
                const Text('Expense Categories',
                    style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppTheme.textPrimary)),
                const SizedBox(height: 4),
                const Text(
                  'Default categories cannot be removed.',
                  style: TextStyle(
                      fontSize: 13, color: AppTheme.textSecondary),
                ),
                const SizedBox(height: 14),

                // Default categories (read-only chips)
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: AppConstants.categories.map((cat) {
                    final emoji =
                        AppConstants.categoryIcons[cat] ?? '📦';
                    return Chip(
                      label: Text('$emoji  $cat'),
                      backgroundColor: AppTheme.inputFill,
                      side: const BorderSide(color: AppTheme.border),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10)),
                    );
                  }).toList(),
                ),

                // Custom categories
                if (_customCategories.isNotEmpty) ...[
                  const SizedBox(height: 14),
                  const Text('Your categories',
                      style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.textSecondary)),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: _customCategories.map((cat) {
                      return Chip(
                        label: Text('📌  $cat'),
                        backgroundColor: AppTheme.primaryLight,
                        side: const BorderSide(color: AppTheme.primary),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10)),
                        deleteIcon: const Icon(Icons.close, size: 16),
                        deleteIconColor: AppTheme.danger,
                        onDeleted: () => _deleteCategory(cat),
                      );
                    }).toList(),
                  ),
                ],

                const SizedBox(height: 16),

                // Add new category row
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _newCategoryController,
                        textInputAction: TextInputAction.done,
                        onFieldSubmitted: (_) => _addCategory(),
                        textCapitalization: TextCapitalization.sentences,
                        decoration: InputDecoration(
                          hintText: 'New category name…',
                          filled: true,
                          fillColor: AppTheme.inputFill,
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 14, vertical: 12),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          focusedBorder: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(
                                color: AppTheme.primary, width: 1.5),
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    SizedBox(
                      height: 48,
                      child: ElevatedButton(
                        onPressed: _isSavingCategory ? null : _addCategory,
                        style: ElevatedButton.styleFrom(
                          minimumSize: const Size(72, 48),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                        child: _isSavingCategory
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    color: Colors.white))
                            : const Text('Add'),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 36),

                // ── Save salary ────────────────────────────────
                PrimaryButton(
                  label: 'Save Settings',
                  onPressed: _saveSalary,
                  isLoading: _isSaving,
                ),
                const SizedBox(height: 16),

                // ── Sign Out ───────────────────────────────────
                SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: OutlinedButton.icon(
                    onPressed: _confirmSignOut,
                    icon: const Icon(Icons.logout_rounded,
                        color: AppTheme.danger),
                    label: const Text('Sign Out',
                        style: TextStyle(color: AppTheme.danger)),
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppTheme.danger),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
