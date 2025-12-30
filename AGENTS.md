# StockTrack Pro - System Architecture & Documentation

## Overview
StockTrack Pro is a modern Progressive Web App (PWA) designed for efficient warehouse inventory management. It features real-time synchronization, offline capabilities, and role-based access control.

## Architecture

### Frontend (React 19 + Vite 6)
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6
- **State Management**: Zustand 5
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Routing**: State-based view switching (Simple SPA)

### Backend (Firebase)
- **Auth**: Anonymous Auth (upgradable)
- **Database**: Cloud Firestore
- **Offline**: IndexedDB Persistence enabled

### Data Export (Frontend-Based)
Admins can export data directly from the application UI. No external backend required.

#### Export Features (`src/lib/export.ts`)
Available in the **Backup & Export** admin panel:
1.  **Full Backup (JSON)**: Complete data dump including inventory, logs, and users.
2.  **Inventory CSV**: Spreadsheet-compatible format for inventory reporting.
3.  **Logs CSV**: Transaction history export for auditing.

All exports are generated client-side and downloaded directly to the user's device.

## Setup Instructions

### Frontend
1.  `npm install`
2.  Create a `.env` file with your Firebase config:
    ```
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```
3.  `npm run dev`

## Data Model

### Inventory
- `id`: Unique ID
- `name`: Product Name
- `category`: Category
- `quantity`: Current Stock
- `minStock`: Low stock threshold
- `location`: Shelf/Bin location

### Logs
- `type`: IN / OUT / CREATE / AUDIT
- `itemName`: Name of item
- `quantity`: Amount changed
- `user`: User who performed action
- `timestamp`: Time of action

## Roles
- **Admin**: Full access + Team Management + Edit Items + Backup & Export.
- **Staff**: View, Add/Remove Stock, Rapid Receive.
