import 'package:cloud_firestore/cloud_firestore.dart';

class ExpenseModel {
  final String id;
  final double price;
  final String category;
  final String? note;
  final Timestamp createdAt;
  final String monthKey;

  const ExpenseModel({
    required this.id,
    required this.price,
    required this.category,
    this.note,
    required this.createdAt,
    required this.monthKey,
  });

  factory ExpenseModel.fromDoc(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ExpenseModel(
      id: doc.id,
      price: (data['price'] as num).toDouble(),
      category: data['category'] as String,
      note: data['note'] as String?,
      createdAt: data['createdAt'] as Timestamp,
      monthKey: data['monthKey'] as String,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'price': price,
      'category': category,
      'note': note,
      'createdAt': createdAt,
      'monthKey': monthKey,
    };
  }

  DateTime get createdAtDateTime => createdAt.toDate();

  ExpenseModel copyWith({
    double? price,
    String? category,
    String? note,
  }) {
    return ExpenseModel(
      id: id,
      price: price ?? this.price,
      category: category ?? this.category,
      note: note ?? this.note,
      createdAt: createdAt,
      monthKey: monthKey,
    );
  }
}
