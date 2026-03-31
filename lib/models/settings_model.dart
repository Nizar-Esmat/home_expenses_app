class SettingsModel {
  final double salary;
  final String currency;
  final List<String> customCategories;

  const SettingsModel({
    required this.salary,
    required this.currency,
    this.customCategories = const [],
  });

  factory SettingsModel.fromMap(Map<String, dynamic> data) {
    return SettingsModel(
      salary: (data['salary'] as num?)?.toDouble() ?? 0.0,
      currency: 'EGP',
      customCategories: (data['customCategories'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
    );
  }

  factory SettingsModel.defaults() {
    return const SettingsModel(
        salary: 0.0, currency: 'EGP', customCategories: []);
  }

  Map<String, dynamic> toMap() {
    return {
      'salary': salary,
      'currency': 'EGP',
      'customCategories': customCategories,
    };
  }

  SettingsModel copyWith({
    double? salary,
    String? currency,
    List<String>? customCategories,
  }) {
    return SettingsModel(
      salary: salary ?? this.salary,
      currency: 'EGP',
      customCategories: customCategories ?? this.customCategories,
    );
  }
}
