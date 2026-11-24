# System Design: Isolated Multi-User Offline Profiles

## 1. Requirements & Scope

### Functional Requirements
1. **100% Isolated Offline Profiles**: Each user has completely separate accounts, transactions, sub-items, categories, transfers, loans, currency, theme mode, color palette, and reminder settings.
2. **Legacy Data Preservation**: On upgrade, the existing `budgetbuddy.db` becomes the initial profile named **`Personal`** (editable later) with all existing data intact.
3. **Clean Profile Creation**: Newly created profiles start clean with built-in categories and one default `Cash` account (`0.00` balance) — no sample data auto-seeded.
4. **Seamless Switching & Management**:
   * App launches directly into the last active profile.
   * Home header displays a profile pill (`Personal ▾`) that opens a quick-switch bottom sheet (with inline "+ New Profile").
   * Settings screen includes a Profile Management section to create, switch, rename, and delete profiles.
   * Free switching (PIN/biometric lock deferred to a future iteration).
5. **Simultaneous Per-User Notifications**: Each profile maintains independent reminder schedules using unique notification identifiers (`expense-reminder-<userUuid>`). Tapping a notification switches to that user's profile before opening `/add-expense`.
6. **Backup & Restore**:
   * Exports (`.json` and `.db`) strictly export the currently active profile.
   * JSON backup imports let the user choose either **Merge into Current Profile** or **Import as New Profile**.

### Non-Functional Constraints
* 100% offline; zero new native dependencies (`expo-sqlite` and `expo-file-system` only).
* Zero cross-profile data leakage by construction.
* Safe against concurrent async database access during profile switches.

### Out of Scope
* Cloud authentication, multi-device sync, cross-user transfers, combined household analytics, and PIN/biometric locks (schema leaves room for `pinHash` later).

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Global Registry DB: budgetbuddy_registry.db                              │
│  • users (id, uuid, name, dbFileName, createdAt, updatedAt)              │
│  • registry_meta (key='activeUserId', value)                             │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ resolves activeUser.dbFileName
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ Database Connection Manager (src/services/database/client.ts)            │
│  • Serialized mutex lock around open / close / switch                    │
│  • User #1 ("Personal")   ──► budgetbuddy.db                             │
│  • User #N (new profile)  ──► budgetbuddy_u_<uuid>.db                    │
│    └─ Pre-inserts `hasSeededSampleData = '1'` to guarantee clean start   │
└──────────────────────────────────┬───────────────────────────────────────┘
                                   │ updates activeUser in UserContext
                                   ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ React Root (app/_layout.tsx)                                             │
│  <UserProvider>                                                          │
│    <ThemeProvider key={activeUser.uuid}>   ◄─ reloads palette & mode     │
│      <MonthProvider key={activeUser.uuid}> ◄─ resets selected month      │
│        <RootLayoutNav key={activeUser.uuid} /> ◄─ resets stack           │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model

### Registry Database (`budgetbuddy_registry.db`)
```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid       TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  dbFileName TEXT    NOT NULL UNIQUE,
  createdAt  TEXT    NOT NULL,
  updatedAt  TEXT
);

CREATE TABLE IF NOT EXISTS registry_meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

### Per-User Databases (`budgetbuddy.db` / `budgetbuddy_u_<uuid>.db`)
No schema changes are needed inside the per-user financial databases. Every existing table (`accounts`, `categories`, `transactions`, `transaction_items`, `transfers`, `loans`, `loan_repayments`, `settings`), view (`v_cash_movements`), trigger, and migration (`SCHEMA_VERSION = 7`) remains identical.

---

## 4. Component Design & Flows

### A. User Registry & Lifecycle (`src/services/database/users.ts`)
* **`initUserRegistry()`**: Opens `budgetbuddy_registry.db`, runs DDL, and if `users` is empty inserts `{ name: 'Personal', dbFileName: 'budgetbuddy.db', uuid: generateUuidV7() }` and sets `activeUserId`.
* **`createUser(name, options?)`**: Validates non-empty unique name, generates UUIDv7 + `dbFileName = budgetbuddy_u_${uuid}.db`, inserts row, initializes the new DB cleanly (`skipSampleData = true`), and optionally switches to it.
* **`renameUser(id, newName)`**: Updates `name` (enforcing case-insensitive uniqueness) and re-syncs that user's notification title if enabled.
* **`deleteUser(id)`**: Blocks deletion if only 1 user exists. If deleting the active user, switches to another user first, cancels `expense-reminder-<uuid>`, deletes the `.db`, `-wal`, and `-shm` files from the SQLite directory, and deletes the registry row.

### B. Connection Switch & Mutex (`src/services/database/client.ts`)
* `switchDatabase(dbFileName)` acquires a promise mutex:
  1. Awaits any in-flight DB initialization.
  2. Closes `_db` (`await _db.closeAsync()`) and clears `_db` & `_initPromise`.
  3. Updates active filename and opens the new DB via `getDb()`.

### C. Simultaneous Notifications (`src/services/notifications.ts`)
* Identifier per user: `expense-reminder-${user.uuid}`.
* Scheduling cancels **only** `cancelScheduledNotificationAsync(identifier)` rather than `cancelAllScheduledNotificationsAsync()`.
* Notification payload:
  * `title`: `BudgetBuddy (${user.name}) 💰`
  * `data`: `{ action: 'add-expense', userUuid: user.uuid }`
* Response listener passes `(action, userUuid)` to `RootLayoutNav`; if `userUuid` differs from `activeUser.uuid`, `switchUserByUuid(userUuid)` executes before `router.push('/add-expense')`.

### D. Backup & Import (`src/services/sync.ts`)
* Exports use `getDb()`, automatically scoping to the active user.
* Imports validate the `.json` file first, then prompt the user:
  * **Merge into current profile**: Calls `mergeBackupIntoDatabase(data)` on active DB.
  * **Import as new profile**: Prompts for a profile name, creates a clean profile DB, switches to it, and runs `mergeBackupIntoDatabase(data)`.

---

## 5. Architectural Decisions Table

| Decision | Solves | Worsens | Change it when… |
| :--- | :--- | :--- | :--- |
| **Physical DB-per-user (`budgetbuddy_u_<uuid>.db`)** | 100% isolation with zero SQL query rewrites, zero data-leak risk, and per-user `.db`/`.json` backups. | Cross-user SQL queries cannot be executed directly; switching incurs ~20–50ms DB close/open overhead. | Shared wallets, household combined stats, or user-to-user transfers are introduced. |
| **Dedicated SQLite registry (`budgetbuddy_registry.db`)** | Zero new native dependencies (`expo-sqlite` already installed); atomic user registry operations. | Small cold-start overhead (~2–5ms) to resolve the active DB before opening the financial DB. | Remote login/tokens require OS keychain encryption (`expo-secure-store`). |
| **Keyed root providers (`key={activeUser.uuid}`)** | Prevents stale theme palettes, cached balances, and old month filters from leaking across user switches. | Resets navigation stack and scroll state back to Home upon switching profiles. | Users need mid-form profile switching while preserving draft screens. |
| **Per-user notification IDs (`expense-reminder-<uuid>`)** | Allows all profiles to keep independent reminder schedules simultaneously and deep-link to the target profile. | OS notification drawer can show multiple BudgetBuddy reminders if several profiles enable reminders at the same time. | OS notification limits (e.g., iOS 64 local notification cap) become a constraint with many profiles. |
