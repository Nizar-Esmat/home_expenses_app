# Home Expenses App

A simple, modern Flutter app for tracking household expenses using Firebase as the real-time backend. Designed for two phones sharing one account.

---

## Features

- **Login** – Email & password with persistent session
- **Home** – Monthly salary, total spent, remaining budget, progress bar, recent expenses
- **Add Expense** – Amount, category (Food / Bills / Transport / Shopping / Home / Other), optional note
- **Report** – Category breakdown with percentages, full expense list for the current month
- **Settings** – Update monthly salary and currency; sign out

---

## Folder Structure

```
lib/
  main.dart                      # Entry point – Firebase init
  app.dart                       # MaterialApp + auth-state routing
  firebase_options.dart          # ← REPLACE by running flutterfire configure
  core/
    constants/app_constants.dart
    helpers/date_helper.dart
    helpers/currency_helper.dart
    theme/app_theme.dart
  models/
    expense_model.dart
    settings_model.dart
  services/
    auth_service.dart
    expense_service.dart
    settings_service.dart
  screens/
    auth/login_screen.dart
    home/home_screen.dart
    expenses/add_expense_screen.dart
    report/report_screen.dart
    settings/settings_screen.dart
  widgets/
    summary_card.dart
    expense_tile.dart
    category_summary_tile.dart
    empty_state_widget.dart
    primary_button.dart
    primary_text_field.dart
firestore.rules                  # Firestore security rules
```

---

## Firestore Data Model

```
users/{uid}/settings/main
  - salary    : number
  - currency  : string (e.g. "USD")

users/{uid}/expenses/{expenseId}
  - price     : number
  - category  : string
  - note      : string | null
  - createdAt : Timestamp
  - monthKey  : string  (format: "YYYY-MM")
```

---

## Setup Steps

### 1. Prerequisites

- Flutter SDK ≥ 3.0  →  https://flutter.dev/docs/get-started/install
- Android Studio or VS Code with the Flutter extension
- Node.js + npm (needed for Firebase CLI)

Verify Flutter installation:
```bash
flutter doctor
```

### 2. Get Dependencies

```bash
cd home_expenses_app
flutter pub get
```

### 3. Create a Firebase Project

1. Go to https://console.firebase.google.com
2. Click **Add Project**, name it (e.g. `home-expenses`), finish the wizard.
3. Inside the project:
   - **Authentication** → Get started → Enable **Email/Password**
   - **Firestore Database** → Create database → choose **Production mode**
     (you will set the rules in step 6)

### 4. Create the Shared Account

Because the app has login only (no sign-up screen), create the one shared account manually:

1. Firebase Console → **Authentication** → **Users** tab → **Add user**
2. Enter the email and password both phones will use.
3. Save these credentials — they are the only login for the app.

### 5. Connect Firebase to the Flutter Project

Install the FlutterFire CLI (one-time):
```bash
dart pub global activate flutterfire_cli
```

Login to Firebase:
```bash
firebase login
```

Configure the project (run from the project root):
```bash
flutterfire configure
```

- Select your Firebase project when prompted.
- Select **android** (and iOS if needed).

This command will:
- **Replace** `lib/firebase_options.dart` with your real config  
- Add `google-services.json` to `android/app/`  
- Update `android/build.gradle` and `android/app/build.gradle` automatically

### 6. Deploy Firestore Security Rules

Option A — Firebase Console:
1. Firestore Database → **Rules** tab
2. Paste the contents of `firestore.rules` and click **Publish**

Option B — Firebase CLI:
```bash
firebase deploy --only firestore:rules
```

### 7. Create the Required Firestore Index

The expenses query uses `where(monthKey) + orderBy(createdAt)`, which requires a composite index.

**Easiest way:** Run the app once and open your browser. The debug console will print a direct Firebase link to create the index automatically. Click it and wait ~1 minute.

Alternatively, create it manually in Firestore Console:
- Collection: `expenses`
- Fields: `monthKey ASC`, `createdAt DESC`
- Scope: Collection

### 8. Run the App

```bash
flutter run
```

### 9. Build Release APK

```bash
flutter build apk --release
```

APK output path:
```
build/app/outputs/flutter-apk/app-release.apk
```

To build smaller per-architecture APKs (recommended for distribution):
```bash
flutter build apk --split-per-abi --release
```

Transfer the APK to both Android phones and install it.  
Both phones sign in with the same email and password — they will see identical real-time data.

---

## Firestore Security Rules (summary)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      match /expenses/{expenseId} {
        allow read, write, delete: if request.auth != null
                                   && request.auth.uid == userId;
      }
      match /settings/{settingDoc} {
        allow read, write: if request.auth != null
                           && request.auth.uid == userId;
      }
    }
  }
}
```

---

## Final Checklist

- [ ] `flutter pub get` ran successfully
- [ ] Firebase project created
- [ ] Email/Password authentication enabled
- [ ] Firestore database created
- [ ] Shared user account created in Firebase Console
- [ ] `flutterfire configure` ran and `firebase_options.dart` is real (not the placeholder)
- [ ] Firestore security rules deployed
- [ ] Composite index created (`monthKey ASC` + `createdAt DESC`)
- [ ] App runs on device with `flutter run`
- [ ] APK built with `flutter build apk --release`
- [ ] APK installed on both phones
- [ ] Both phones log in and see the same data
