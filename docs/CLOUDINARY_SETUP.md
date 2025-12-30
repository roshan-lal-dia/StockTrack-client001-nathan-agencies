# Cloudinary Setup Guide

StockTrack Pro uses Cloudinary for image uploads (product photos and transaction attachments). Cloudinary provides a generous free tier.

## Free Tier Limits (Credits System)

Cloudinary uses a **credits-based system**. Each credit represents:

| Resource | Processing | Storage | Delivery |
|----------|------------|---------|----------|
| Image | 1K Transformations | 1 GB | 1 GB Bandwidth |
| Video | 1K Transformations | 1 GB | 1 GB Bandwidth |
| Raw Files | 1K Transformations | 1 GB | 1 GB Bandwidth |

**Free Plan**: 25 monthly credits (resets each month)

For a typical warehouse with ~100-500 products, the free tier is more than sufficient.

## Why Cloudinary?

- **Free Tier**: 25 credits/month (plenty for most warehouses)
- **CDN Delivery**: Images load fast from anywhere in the world
- **Automatic Optimization**: Images are automatically compressed and served in modern formats
- **Thumbnails**: Dynamic resizing - no need to store multiple sizes
- **No Firebase Storage**: Firebase Spark (free) plan doesn't include Storage

## Setup Steps

### 1. Create a Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com/)
2. Click "Sign Up for Free"
3. Complete the registration

### 2. Get Your Cloud Name

1. Log into your Cloudinary Dashboard
2. Your **Cloud Name** is displayed at the top of the dashboard
3. Example: `dzroltyiy`

Your cloud name is already configured in `.env`:
```env
VITE_CLOUDINARY_CLOUD_NAME=dzroltyiy
```

### 3. Create an Unsigned Upload Preset

Since StockTrack runs entirely in the browser, we need an **unsigned upload preset** (no server-side secrets required).

⚠️ **IMPORTANT**: Never use your API Key or API Secret in frontend code! They should only be used server-side.

#### Step-by-Step:

1. Go to **Settings** (gear icon in bottom-left) → **Upload**
2. Scroll to **Upload presets** section
3. Click **Add upload preset**

#### Basic Settings Tab:
- **Upload preset name**: `stocktrack`
- **Signing Mode**: Select **Unsigned** ⚠️ (Critical!)

#### Folder & Storage Tab:
- **Folder**: `stocktrack` (this organizes all uploads in one folder)
  - Or leave blank and the app will specify `stocktrack/products` or `stocktrack/transactions` dynamically

#### Upload Control Tab:
This is where you set file restrictions:

- **Allowed formats** (under "Allowed file formats"):
  - Check: `jpg`, `png`, `gif`, `webp`
  - Uncheck formats you don't want to allow
  
- **Max file size** (under "Max file size"):
  - Enter: `10000000` (10MB in bytes)
  - Or: `10mb` if the field accepts text

#### Media Analysis Tab (Optional):
- You can enable auto-tagging or moderation here if needed

#### Click **Save** when done!

### 4. Verify Your .env File

Your `.env` file should have:

```env
VITE_CLOUDINARY_CLOUD_NAME=dzroltyiy
VITE_CLOUDINARY_UPLOAD_PRESET=stocktrack
```

### 5. Restart the Dev Server

```bash
npm run dev
```

## Security Considerations

### Unsigned Uploads

Unsigned presets allow anyone with your cloud name and preset name to upload. To mitigate abuse:

1. **Set allowed formats** (jpg, png, gif, webp, pdf)
2. **Set max file size** (e.g., 10MB)
3. **Enable moderation** (optional, Cloudinary can auto-moderate content)
4. **Monitor usage** in your Cloudinary dashboard

### Production Recommendations

For production deployments with sensitive data:

1. Consider upgrading to signed uploads with a backend proxy
2. Enable Cloudinary's abuse detection features
3. Set up usage alerts in your dashboard

## Features

Once configured, StockTrack will:

1. **Product Photos**: Upload and display product images in inventory
2. **Transaction Attachments**: Attach receipts, invoices, or photos to stock movements
3. **Automatic Thumbnails**: List views show optimized 80x80 thumbnails
4. **Click to View**: Click any thumbnail to see the full image

## Troubleshooting

### "Cloudinary not configured"

- Check that both `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are set in `.env`
- Restart the dev server after adding env variables

### "Upload failed"

- Verify your upload preset is set to **Unsigned**
- Check your Cloudinary dashboard for usage limits
- Ensure the file format is allowed in your preset

### Images not showing

- Check browser console for CORS errors
- Verify the Cloudinary URL is correct
- Try opening the URL directly in a new tab

## Usage Limits (Free Tier)

| Resource | Monthly Limit |
|----------|---------------|
| Credits | 25 |
| Per Credit: Storage | 1 GB |
| Per Credit: Bandwidth | 1 GB |
| Per Credit: Transformations | 1,000 |
| Max Image Size | 10 MB |
| Max Video Size | 100 MB |

For most small-to-medium warehouses, the free tier is more than sufficient.

## Optional: Advanced Configuration

### Custom Transformations

Edit `src/lib/imageUtils.ts` to customize:

```typescript
// Thumbnail size (default: 80x80)
export const getCloudinaryThumbnail = (url: string, size = 80) => { ... }

// Optimized display size (default: 800px max width)
export const getOptimizedUrl = (url: string, maxWidth = 800) => { ... }
```

### Folder Organization

The folder is set in your upload preset OR dynamically by the app code.

**Option A: Single Folder (Simplest)**
In your upload preset, set Folder to: `stocktrack`
All uploads go to one folder.

**Option B: Organized Folders (Set in App)**
Leave the preset folder blank. The app code in `imageUtils.ts` specifies:
- `stocktrack/products` for product images  
- `stocktrack/transactions` for transaction attachments

To change folders, edit the `uploadToCloudinary()` function in `src/lib/imageUtils.ts`:

```typescript
// Current default folder
export const uploadToCloudinary = async (
  file: File,
  folder: string = 'stocktrack'  // Change this default
): Promise<UploadedImage> => {
```

This keeps your Cloudinary media library organized and easy to browse.
