# StockTrack Pro - System Architecture & Documentation

## Overview
StockTrack Pro is a modern Progressive Web App (PWA) designed for efficient warehouse inventory management. It features real-time synchronization, offline capabilities, role-based access control, and production-grade UX features.

## Key Features
- **Multi-Auth Support**: Email/Password, Google Sign-In, and Demo mode (Anonymous)
- **Dark Mode**: System-aware theme with manual override (light/dark/system)
- **Command Palette**: Quick navigation with `Alt + K`
- **Toast Notifications**: Non-blocking feedback for all actions
- **Advanced Filtering**: Filter by stock level, category, location with sorting
- **Real-time Sync**: Firebase Firestore with offline persistence
- **Data Portability**: Export to JSON/CSV, no vendor lock-in
- **Role-based Access**: Admin and Staff roles with different permissions
- **Team Management**: Admins can promote/demote users and manage access
- **Keyboard Shortcuts**: Power-user features (Alt-based to avoid browser conflicts)
- **Low Stock Alerts**: Visual badges and alerts for items below threshold
- **Item Details Drawer**: Quick view of item info and history
- **Confirmation Dialogs**: Safe deletion with confirmations
- **Loading Skeletons**: Smooth perceived performance
- **Empty States**: Helpful guidance when no data
- **Image Uploads**: Product photos and transaction attachments via Cloudinary
- **PWA Support**: Installable app with full offline capabilities
- **Offline Mode**: Works without internet, syncs when back online
- **Barcode Scanner**: Scan barcodes/QR codes via camera to find or add items
- **CSV Import**: Bulk import products from spreadsheet files
- **Dashboard Charts**: Visual analytics with activity trends, category distribution
- **Print Labels**: Generate and print product labels with barcodes

## Offline & PWA Features

### How Offline Works
1. **Service Worker**: Caches all app assets for instant loading without internet
2. **Firestore Persistence**: Data is cached in IndexedDB and syncs when online
3. **Optimistic Updates**: UI responds immediately, syncs in background
4. **Cached Auth**: Users can access the app offline after first login
5. **Offline Indicator**: Yellow banner shows when offline with sync message

### PWA Installation
- Install via browser's "Add to Home Screen" or install button
- Works as standalone app without browser chrome
- Auto-updates when new version is available
- Precaches all assets (JS, CSS, HTML, images)

### Offline Limitations
- **Image Uploads**: Require internet (Cloudinary)
- **First Login**: Requires internet to authenticate
- **New User Registration**: Requires internet
- All other features work fully offline

## Architecture

### Frontend (React 19 + Vite 6)
- **Framework**: React 19.2.1 with TypeScript 5.9.3
- **Build Tool**: Vite 6.0.1 with @tailwindcss/vite + vite-plugin-pwa
- **State Management**: Zustand 5.0.1 with persist middleware
- **Styling**: Tailwind CSS 4.0 with dark mode support
- **Icons**: Lucide React 0.454.0
- **Routing**: State-based view switching (Simple SPA)
- **PWA**: Service worker with Workbox for caching

### Backend (Firebase)
- **Auth**: Email/Password, Google Sign-In, Anonymous Auth
- **Database**: Cloud Firestore
- **Offline**: IndexedDB Persistence enabled
- **Security**: Role-based Firestore rules

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Alt + K` | Open Command Palette |
| `Alt + N` | Create New Item |
| `Alt + R` | Rapid Receive Mode |
| `Alt + D` | Go to Dashboard |
| `Alt + I` | Go to Inventory |
| `Alt + ,` | Open Settings |
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
│   ├── LoginScreen.tsx     # Authentication screen (Email/Password, Google, Demo)
│   ├── Dashboard.tsx       # Overview stats and recent activity
│   ├── Inventory.tsx       # Product list with advanced filters
│   ├── RapidReceive.tsx    # Quick stock entry mode
│   ├── Logs.tsx            # Audit trail table
│   ├── Team.tsx            # User/role management (Admin)
│   ├── Backup.tsx          # Export panel (Admin)
│   ├── Settings.tsx        # User preferences, theme & sign out
│   ├── Modals.tsx          # Transaction/Edit dialogs
│   ├── Toast.tsx           # Notification container
│   ├── CommandPalette.tsx  # Quick search/navigation (Alt+K)
│   ├── ConfirmDialog.tsx   # Confirmation modals for dangerous actions
│   ├── EmptyState.tsx      # Helpful empty state displays
│   ├── Skeleton.tsx        # Loading skeleton components
│   ├── ItemDetailDrawer.tsx # Item details side panel
│   ├── LowStockAlerts.tsx  # Low stock notification components
│   └── ImageUpload.tsx     # Image upload with Cloudinary integration
├── store/
│   ├── useStore.ts         # Main app state (Zustand)
│   ├── useThemeStore.ts    # Theme persistence
│   └── useToastStore.ts    # Toast notifications
├── lib/
│   ├── firebase.ts         # Firebase configuration
│   ├── export.ts           # Data export utilities
│   └── imageUtils.ts       # Cloudinary upload utilities
├── types/
│   └── index.ts            # TypeScript interfaces
├── App.tsx                 # Main app with routing
├── main.tsx                # Entry point
└── index.css               # Tailwind imports
docs/
├── FIREBASE_SETUP.md       # Firebase integration guide
└── CLOUDINARY_SETUP.md     # Cloudinary image upload guide
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
3. (Optional) Add Cloudinary config for image uploads:
    ```
    VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
    VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
    ```
    See `docs/CLOUDINARY_SETUP.md` for detailed Cloudinary setup instructions.
4. `npm run dev`

## Data Model

### Inventory
- `id`: Unique ID
- `name`: Product Name
- `category`: Category
- `quantity`: Current Stock
- `minStock`: Low stock threshold
- `location`: Shelf/Bin location
- `notes`: Additional details
- `imageUrl`: Product photo URL (Cloudinary)
- `thumbnailUrl`: Optimized thumbnail URL
- `lastUpdated`: Timestamp

### Logs
- `type`: IN / OUT / CREATE / AUDIT
- `itemName`: Name of item
- `quantity`: Amount changed
- `user`: User who performed action
- `attachmentUrl`: Transaction attachment URL (Cloudinary)
- `attachmentName`: Original filename of attachment
- `timestamp`: Time of action

## Roles
- **Admin**: Full access + Team Management + Edit Items + Backup & Export
- **Staff**: View, Add/Remove Stock, Rapid Receive
