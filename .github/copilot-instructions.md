# Copilot Instructions — BudgetBuddy

## Commands

```bash
# Start dev server
npm start

# Start with cleared cache
npm run start:clear

# Run on Android / iOS
npm run android
npm run ios

# Lint
npm run lint
```

> There is no test suite. No test runner is configured.

## Architecture

**BudgetBuddy** is an Expo (React Native) personal finance app using **expo-router** for file-based routing and **expo-sqlite** for local-only data storage.

### Routing layout

```
app/
  _layout.tsx          ← Root: wraps everything in ThemeProvider + SafeAreaProvider
  (tabs)/
    _layout.tsx        ← Custom floating tab bar (Home / Statistics / Settings)
    home.tsx
    statistics.tsx
    settings.tsx
  add-expense.tsx      ← Modal screen
  add-income.tsx       ← Modal screen
  report.tsx
  categories.tsx
  income-categories.tsx
```

Each route file is a thin shell that renders its corresponding screen component from `src/screens/`.

### Data layer

All database logic lives in `src/services/database.ts`. It uses a lazy-initialized singleton (`getDb()`) that opens `budgetbuddy.db` via `expo-sqlite` and runs `initDb` once on first access. Schema is created with `CREATE TABLE IF NOT EXISTS` — no migration framework.

- **Expenses** use `price` field; **Incomes** use `amount` field (different column names).
- Both tables store a `monthKey` (`YYYY-MM`) for efficient month-based queries.
- Categories are stored in their own tables (`categories`, `income_categories`) and referenced by **name string** (not foreign key ID) in expenses/incomes.
- Built-in categories have `isDefault = 1` and cannot be renamed or deleted.
- If a custom category is renamed, all existing expenses/incomes referencing the old name are updated in the same transaction.

### Theme system

`src/theme/ThemeContext.tsx` provides a `useTheme()` hook returning a `colors` object (type `ColorScheme`). There are 9 color palettes (`grey`, `green`, `blue`, `purple`, `orange`, `red`, `teal`, `pink`, `yellow`) defined in `src/theme/colors.ts`. The palette and dark/light mode are persisted in the `settings` SQLite table.

**Always use `colors.*` from `useTheme()` for any color value — never hardcode hex values in components.**

## Key Conventions

### Path aliases

Use the `@/` aliases defined in `tsconfig.json` and `babel.config.cjs`:

| Alias | Resolves to |
|---|---|
| `@/components/*` | `src/components/*` |
| `@/screens/*` | `src/screens/*` |
| `@/services/*` | `src/services/*` |
| `@/theme/*` | `src/theme/*` |
| `@/types` | `src/types/index.ts` |

### Types

All shared types are in `src/types/index.ts`. The `Category.isDefault` field is typed as `number` (SQLite integer), not `boolean` — check with `=== 1` or `=== 0`.

### Utility functions

`src/services/constants.ts` contains shared helpers used across the app:
- `currentMonthKey()` — returns current `YYYY-MM` string
- `monthKeyToLabel(key)` — formats `YYYY-MM` to `"Month YYYY"`
- `formatCurrency(amount, currency)` — formats with locale-aware decimals
- `formatDate(iso)` — formats ISO string to `"Mon D · HH:MM"`
- `CATEGORY_COLORS` / `INCOME_CATEGORY_COLORS` — 10-color palettes for pickers
- `EMOJI_GROUPS` — categorized emoji picker data

### Components

Shared UI primitives in `src/components/`:
- `AppButton` — primary action button
- `AppInput` — themed text input
- `DateTimeInput` — date/time picker wrapper
- `CategoryCard` / `IncomeCategoryCard` — category list items with edit/delete
- `ExpenseTile` / `IncomeTile` — transaction list items
- `SummaryCard` — month summary display
- `CategoryBar` — horizontal category filter bar

### Babel assumption

`babel.config.cjs` sets `superIsCallableConstructor: true` to prevent a Hermes crash when subclassing native classes (e.g., `Error`). Do not remove this.
