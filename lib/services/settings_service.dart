import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/settings_model.dart';

class SettingsService {
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  String get _uid => FirebaseAuth.instance.currentUser!.uid;

  DocumentReference<Map<String, dynamic>> _settingsRef(String uid) {
    return _db
        .collection('users')
        .doc(uid)
        .collection('settings')
        .doc('main');
  }

  /// Returns a real-time stream of user settings.
  /// Falls back to defaults if the document does not exist yet.
  Stream<SettingsModel> getSettings() {
    return _settingsRef(_uid).snapshots().map((snap) {
      if (!snap.exists || snap.data() == null) {
        return SettingsModel.defaults();
      }
      return SettingsModel.fromMap(snap.data()!);
    });
  }

  Future<void> saveSettings(SettingsModel settings) async {
    await _settingsRef(_uid).set(settings.toMap(), SetOptions(merge: true));
  }
}
