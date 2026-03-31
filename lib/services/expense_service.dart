import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/expense_model.dart';
import '../models/month_summary.dart';
import '../core/helpers/date_helper.dart';

class ExpenseService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  CollectionReference<Map<String, dynamic>> _expensesRef(String uid) {
    return _db.collection('users').doc(uid).collection('expenses');
  }

  /// Returns real-time stream of expenses for the given month key (e.g. "2026-03").
  /// Sorted in Dart to avoid requiring a Firestore composite index.
  Stream<List<ExpenseModel>> getMonthExpenses(String monthKey) {
    return _expensesRef(_uid)
        .where('monthKey', isEqualTo: monthKey)
        .snapshots()
        .map((snap) {
          final list = snap.docs.map(ExpenseModel.fromDoc).toList();
          list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
          return list;
        });
  }

  Future<void> addExpense({
    required double price,
    required String category,
    String? note,
  }) async {
    final now = DateTime.now();
    final cleanNote = note?.trim().isEmpty == true ? null : note?.trim();
    await _expensesRef(_uid).add({
      'price': price,
      'category': category,
      'note': cleanNote,
      'createdAt': Timestamp.fromDate(now),
      'monthKey': DateHelper.getMonthKey(now),
    });
  }

  Future<void> updateExpense({
    required String expenseId,
    required double price,
    required String category,
    String? note,
  }) async {
    final cleanNote = note?.trim().isEmpty == true ? null : note?.trim();
    await _expensesRef(_uid).doc(expenseId).update({
      'price': price,
      'category': category,
      'note': cleanNote,
    });
  }

  Future<void> deleteExpense(String expenseId) async {
    await _expensesRef(_uid).doc(expenseId).delete();
  }

  /// Returns a real-time stream of all months that have expenses,
  /// each with total spent and count, sorted newest-first.
  Stream<List<MonthSummary>> getMonthHistory() {
    return _expensesRef(_uid).snapshots().map((snap) {
      final Map<String, (double, int)> agg = {};
      for (final doc in snap.docs) {
        final e = ExpenseModel.fromDoc(doc);
        final prev = agg[e.monthKey] ?? (0.0, 0);
        agg[e.monthKey] = (prev.$1 + e.price, prev.$2 + 1);
      }
      return (agg.entries
              .map((entry) => MonthSummary(
                    monthKey: entry.key,
                    totalSpent: entry.value.$1,
                    count: entry.value.$2,
                  ))
              .toList()
        ..sort((a, b) => b.monthKey.compareTo(a.monthKey)));
    });
  }
}
