# StockTrack Pro - System Architecture & Documentation

## Overview
StockTrack Pro is a modern Progressive Web App (PWA) designed for efficient warehouse inventory management. It features real-time synchronization, offline capabilities, role-based access control, and production-grade UX features.

## Key Features
- **Dark Mode**: System-aware theme with manual override (light/dark/system)
- **Command Palette**: Quick navigation with `Ctrl/Cmd + K`
- **Toast Notifications**: Non-blocking feedback for all actions
- **Advanced Filtering**: Filter by stock level, category, location with sorting
- **Real-time Sync**: Firebase Firestore with offline persistence
- **Data Portability**: Export to JSON/CSV, no vendor lock-in
- **Role-based Access**: Admin and Staff roles with different permissions
- **Keyboard Shortcuts**: Power-user features throughout

## Architecture

### Frontend (React 19 + Vite 6)
- **Framework**: React 19.2.1 with TypeScript 5.9.3
- **Build Tool**: Vite 6.0.1 with @tailwindcss/vite
- **State Management**: Zustand 5.0.1 with persist middleware
- **Styling**: Tailwind CSS 4.0 with dark mode support
- **Icons**: Lucide React 0.454.0
- **Routing**: State-based view switching (Simple SPA)

### Backend (Firebase)
- **Auth**: Anonymous Auth (upgradable to email/password)
- **Database**: Cloud Firestore
- **Offline**: IndexedDB Persistence enabled

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open Command Palette |
| `Ctrl/Cmd + N` | Create New Item |
| `Escape` | Close Modals/Dialogs |

### Data Export (`src/lib/export.ts`)
Available in the **Backup & Export** admin panel:
1. **Full Backup (JSON)**: Complete data dump including inventory, logs, and users
2. **Inventory CSV**: Spreadsheet-compatible format for inventory reporting
3. **Logs CSV**: Transaction history export for auditing

All exports are generated client-side and downloaded directly to the user's device.

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx          # App shell with navigation
│   ├── Dashboard.tsx       # Overview stats and recent activity
│   ├── Inventory.tsx       # Product list with advanced filters
│   ├── RapidReceive.tsx    # Quick stock entry mode
│   ├── Logs.tsx            # Audit trail table
│   ├── Team.tsx            # User/role management (Admin)
│   ├── Backup.tsx          # Export panel (Admin)
│   ├── Settings.tsx        # User preferences & theme
│   ├── Modals.tsx          # Transaction/Edit dialogs
│   ├── Toast.tsx           # Notification container
│   └── CommandPalette.tsx  # Quick search/navigation
├── store/
│   ├── useStore.ts         # Main app state (Zustand)
│   ├── useThemeStore.ts    # Theme persistence
│   └── useToastStore.ts    # Toast notifications
├── lib/
│   ├── firebase.ts         # Firebase configuration
│   └── export.ts           # Data export utilities
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx                 # Main app with routing
├── main.tsx                # Entry point
└── index.css               # Tailwind imports
```

## Setup Instructions

### Frontend
1. `npm install`
2. Create a `.env` file with your Firebase config:
    ```
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```
3. `npm run dev`

## Data Model

### Inventory
- `id`: Unique ID
- `name`: Product Name
- `category`: Category
- `quantity`: Current Stock
- `minStock`: Low stock threshold
- `location`: Shelf/Bin location
- `notes`: Additional details
- `lastUpdated`: Timestamp

### Logs
- `type`: IN / OUT / CREATE / AUDIT
- `itemName`: Name of item
- `quantity`: Amount changed
- `user`: User who performed action
- `timestamp`: Time of action

## Roles
- **Admin**: Full access + Team Management + Edit Items + Backup & Export
- **Staff**: View, Add/Remove Stock, Rapid Receive
