# AGENTS.md — BudgetBuddy

## Commands

```bash
npm start           # Expo dev server
npm run start:clear # Expo dev server with cleared cache
npm run android      # Expo on Android emulator
npm run ios          # Expo on iOS simulator (Mac only)
npm run lint         # ESLint via expo lint
```

**No test suite exists. No test runner is configured.**

## Architecture

Expo SDK 54 / React Native 0.81 / TypeScript app. 100% offline — all data in local SQLite (`budgetbuddy.db`).

### Routing (`app/`)

- `app/_layout.tsx` — root: `GestureHandlerRootView` → `SafeAreaProvider` → `ThemeProvider` → `DialogProvider` → `Stack`
- `app/(tabs)/_layout.tsx` — custom floating tab bar (Home / Statistics / Settings)
- Route files are thin shells rendering screen components from `src/screens/`
- `add-expense` and `add-income` are modal screens

### Database (`src/services/database/`)

- **`client.ts`** — lazy singleton `getDb()`, schema creation, migrations, seed data
- **Schema versioning**: `PRAGMA user_version` in `client.ts` (`SCHEMA_VERSION = 6`). Migrations are incremental and non-destructive via `src/services/database/migrations.ts`
- **Foreign keys**: `PRAGMA foreign_keys = ON;` is enforced on every database connection
- **Time-sortable UUIDv7**: Entities (`accounts`, `transactions`, `transfers`, `loans`) have `uuid TEXT UNIQUE` generated via RFC 9562 UUIDv7 for deterministic backup deduplication and optimal B-tree indexing
- **Direct SQLite Aggregations (`analytics.ts`)**: Category spending, daily summaries, quick KPI insights, and top expenses are computed directly in SQLite using indexable date-range queries (`>= startIso AND < endIso`), avoiding in-memory array allocations
- **Unified `transactions` table** with `type` column (`'EXPENSE' | 'INCOME'`) and `amountMinor` (integer cents). Separate `transaction_items` table for sub-items. **Legacy `expenses`/`incomes` tables no longer exist** — the old copilot instructions referencing them are stale
- **Cash movements view (`v_cash_movements`) & triggers**: Unified view across transactions and transfers, plus SQLite validation triggers enforcing account types, transaction types, and distinct transfer accounts
- **`accounts` table**: `openingBalanceMinor` / `currentBalanceMinor` (cents). `isDefault=1` accounts cannot be deleted. Account types stored as `'CASH' | 'BANK' | 'EWALLET'` in DB but typed as `'cash' | 'bank_account' | 'e_wallet'` in TS — conversion in `helpers.ts`
- **`categories` table**: unified for both expense and income, keyed by `(type, name)`. `isDefault=1` categories cannot be renamed/deleted. Custom category renames cascade to all referencing transactions in the same transaction
- **`transfers` table**: between accounts, optional fee with separate `feeAccountId`
- **Money is always stored as minor units (integer cents)** — use `toMinorUnits()` / `fromMinorUnits()` from `helpers.ts`

### Data loading pattern

Screens use `useFocusEffect(useCallback(() => { loadData(); }, []))` to reload on focus.

### Theme system (`src/theme/`)

- Always use `colors.*` from `useTheme()` — **never hardcode hex values in components**
- 10 palettes in `colors.ts`: grey, green, blue, purple, orange, red, teal, pink, yellow, lime
- Theme mode and palette persisted in SQLite `settings` table
- `toggleTheme()` cycles through `'light' | 'dark' | 'system'`

## Key Conventions

### Path aliases (`@/`)

| Alias | Resolves to |
|---|---|
| `@/components/*` | `src/components/*` |
| `@/screens/*` | `src/screens/*` |
| `@/services/*` | `src/services/*` |
| `@/theme/*` | `src/theme/*` |
| `@/types` | `src/types/index.ts` |

Configured in both `tsconfig.json` and `babel.config.cjs` (via `module-resolver` plugin).

### SQLite boolean fields

`isDefault`, `isPrimary`, `isArchived` are `INTEGER` in SQLite — typed as `number` in TS. Check with `=== 1` / `=== 0`, not `true`/`false`.

### Babel assumption

`babel.config.cjs` sets `superIsCallableConstructor: true` — prevents Hermes crash when extending native classes. **Do not remove this.**

### Backup/restore

`src/services/sync.ts`: `exportBackupAndShare()` → JSON dump + OS share sheet. `pickAndImportBackupMerge()` → pick `.json` file, merge into DB (skips duplicates by ID).

## Known gotchas

- Schema migrations are **incremental and non-destructive** via `src/services/database/migrations.ts` — tables are never dropped on version bumps
- Foreign keys are enforced at runtime via `PRAGMA foreign_keys = ON;` in `client.ts`
- The `android/` directory is in `.gitignore` — use `npx expo prebuild` to regenerate
- Default currency is `EGP` — hardcoded in `client.ts`
