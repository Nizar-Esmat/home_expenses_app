# BudgetBuddy 💰

A React Native (Expo) personal expense tracker. **Fully offline — data stored locally on each device using SQLite. No internet connection required.**

## Features
- 📊 Monthly budget tracking (salary vs. spent)
- ➕ Add / edit / delete expenses with category & note
- 📋 Full expense report with category breakdown
- 📅 Month history
- 🌙 Dark mode with custom green palette (`#091413`, `#285A48`, `#408A71`, `#B0E4CC`)
- 😀 Emoji picker for custom categories
- 💾 100% local SQLite storage — no Firebase, no login

## Tech Stack
- **React Native** + **Expo** (SDK 52)
- **expo-sqlite** — local database
- **expo-router** — file-based navigation
- **TypeScript**

## How to Run

### Prerequisites
```bash
npm install -g expo-cli
```

### Install & Start
```bash
cd home_expenses_app
npm install
npx expo start
```

### Run on your phone
1. Install **Expo Go** from the App Store or Google Play
2. Scan the QR code shown in terminal
3. The app opens instantly — no build needed

### Run on Android emulator
```bash
npx expo start --android
```

### Run on iOS simulator (Mac only)
```bash
npx expo start --ios
```

## Project Structure
```
app/               # Expo Router screens (file-based routing)
src/
  screens/         # Main screen components
  components/      # Reusable UI components
  services/        # SQLite database service + constants
  theme/           # Colors & ThemeContext (dark/light)
  types/           # TypeScript interfaces
```
