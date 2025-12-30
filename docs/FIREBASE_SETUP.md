# Firebase Integration Guide for StockTrack Pro

## Overview
StockTrack Pro uses Firebase for authentication, real-time database, and offline persistence. This guide covers setting up a new Firebase project and configuring the application.

> **Note**: StockTrack also supports **LOCAL mode** (no Firebase required). The app will work with localStorage when Firebase is not configured. See [Running Without Firebase](#running-without-firebase) below.

> **For Image Uploads**: See [CLOUDINARY_SETUP.md](./CLOUDINARY_SETUP.md) - Firebase Storage is not used (not available on free tier).

---

## Quick Start

If you already have a Firebase project, just add these to your `.env` file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

Then run `npm run dev`. For new projects, follow the detailed steps below.

---

## 1. Create a Firebase Project

### Step 1: Go to Firebase Console
1. Visit [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Click **"Create a project"** or **"Add project"**

### Step 2: Configure Project
1. Enter a project name (e.g., "StockTrack-YourCompany")
2. (Optional) Enable Google Analytics
3. Click **"Create project"**
4. Wait for project creation to complete

---

## 2. Enable Authentication

### Step 1: Go to Authentication
1. In the Firebase Console sidebar, click **"Authentication"**
2. Click **"Get started"**

### Step 2: Enable Sign-in Methods
StockTrack supports multiple authentication methods:

#### Anonymous Auth (Required for initial setup)
1. Go to **Sign-in method** tab
2. Click **"Anonymous"**
3. Toggle **"Enable"**
4. Click **"Save"**

#### Email/Password (Recommended for production)
1. Click **"Email/Password"**
2. Toggle **"Enable"**
3. Optionally enable **"Email link (passwordless sign-in)"**
4. Click **"Save"**

#### Google Sign-In (Optional)
1. Click **"Google"**
2. Toggle **"Enable"**
3. Add your **Project support email**
4. Click **"Save"**

---

## 3. Set Up Cloud Firestore

### Step 1: Create Database
1. In the sidebar, click **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in test mode"** for development (change later for production)
4. Select a Cloud Firestore location (choose closest to your users)
5. Click **"Enable"**

### Step 2: Configure Security Rules
For development, use permissive rules. **Change these before production!**

#### Development Rules (Test Mode):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.time < timestamp.date(2025, 12, 31);
    }
  }
}
```

#### Production Rules (Recommended):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own user document
    match /artifacts/{appId}/public/data/users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Inventory and logs - authenticated users only
    match /artifacts/{appId}/public/data/inventory/{itemId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
      allow delete: if request.auth != null && 
        get(/databases/$(database)/documents/artifacts/$(appId)/public/data/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /artifacts/{appId}/public/data/logs/{logId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if false; // Logs are immutable
    }
  }
}
```

### Step 3: Enable Offline Persistence
Offline persistence is already enabled in the app code (`src/lib/firebase.ts`). No additional Firebase Console configuration needed.

---

## 4. Get Your Firebase Configuration

### Step 1: Register Web App
1. Go to **Project Settings** (gear icon in sidebar)
2. Scroll down to **"Your apps"**
3. Click the **Web icon** (`</>`)
4. Enter an app nickname (e.g., "StockTrack Web")
5. (Optional) Enable Firebase Hosting
6. Click **"Register app"**

### Step 2: Copy Configuration
You'll see a configuration object like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### Step 3: Create Environment File
Create a `.env` file in the project root:
```env
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef123456
```

---

## 5. Initialize Database Structure

The app automatically creates the following structure:
```
artifacts/
└── {APP_ID}/
    └── public/
        └── data/
            ├── inventory/     # Inventory items
            │   └── {itemId}
            ├── logs/          # Transaction logs
            │   └── {logId}
            └── users/         # User profiles
                └── {userId}
```

### Create First Admin User
After the app runs, you'll be created as a "staff" user. To make yourself an admin:

1. Go to Firebase Console → Firestore Database
2. Navigate to: `artifacts/{APP_ID}/public/data/users/{your-uid}`
3. Edit the document
4. Change `role` from `"staff"` to `"admin"`
5. Refresh the app

---

## 6. Sign Out Implementation

The sign out functionality uses Firebase Auth's `signOut()` method:

```typescript
import { auth } from '@/lib/firebase';

const handleSignOut = async () => {
  try {
    await auth.signOut();
    // User will be redirected to login or anonymous auth
  } catch (error) {
    console.error('Sign out error:', error);
  }
};
```

### Why Sign Out Might Not Work:
1. **Anonymous Auth**: If using anonymous auth, signing out creates a new anonymous user
2. **No Login Screen**: App may immediately re-authenticate anonymously
3. **Persistence**: Cached auth state may persist

### Solution: Add Login/Logout Flow
For production, implement a proper auth flow:
1. Show a login screen for unauthenticated users
2. Offer email/password or Google sign-in
3. Only use anonymous auth as a "demo mode"

---

## 7. Common Issues & Solutions

### Issue: "Permission Denied" Errors
- Check Firestore security rules
- Ensure user is authenticated
- Verify the document path is correct

### Issue: Data Not Syncing
- Check internet connection
- Verify Firebase configuration
- Check browser console for errors

### Issue: Sign Out Not Working
- Clear browser cache and cookies
- Check if anonymous auth is enabled
- Add a proper login screen

### Issue: Offline Mode Not Working
- Ensure `enableIndexedDbPersistence` is called
- Check browser supports IndexedDB
- Clear site data and reload

---

## 8. Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_FIREBASE_API_KEY` | Firebase API key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Auth domain | `project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | `my-project-123` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Storage bucket | `project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Messaging sender ID | `123456789` |
| `VITE_FIREBASE_APP_ID` | Web app ID | `1:123...:web:abc...` |

---

## 9. Security Checklist

Before going to production:

- [ ] Change Firestore security rules from test mode
- [ ] Enable email verification for email/password auth
- [ ] Set up proper admin role management
- [ ] Enable App Check for API protection
- [ ] Set up Firebase Authentication limits
- [ ] Configure authorized domains in Auth settings
- [ ] Enable audit logging in Cloud Console
- [ ] Set up budget alerts for Firebase usage
- [ ] Review and restrict API key permissions

---

## 10. Upgrading Authentication

### From Anonymous to Email/Password

The app supports upgrading anonymous users to permanent accounts:

```typescript
import { linkWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const upgradeAccount = async (email: string, password: string) => {
  const credential = EmailAuthProvider.credential(email, password);
  try {
    await linkWithCredential(auth.currentUser!, credential);
    console.log('Account upgraded successfully');
  } catch (error) {
    console.error('Upgrade failed:', error);
  }
};
```

This preserves the user's UID and all associated data.

---

## Running Without Firebase

StockTrack works in **LOCAL mode** when Firebase is not configured:

- Data is stored in browser localStorage
- No authentication (single-user mode)
- No cloud sync between devices
- Status indicator shows "LOCAL" in the sidebar

This is useful for:
- Quick demos and testing
- Single-device deployments
- Offline-only usage

To use LOCAL mode, simply don't set any `VITE_FIREBASE_*` variables in `.env`.

---

## Related Documentation

- [Cloudinary Setup](./CLOUDINARY_SETUP.md) - For image uploads (product photos, attachments)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Console](https://console.firebase.google.com/)
- [Firebase Community](https://firebase.google.com/community)
