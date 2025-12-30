import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { 
  uploadToCloudinary, 
  validateImageFile, 
  isCloudinaryConfigured,
  UploadedImage
} from '@/lib/imageUtils';

interface ImageUploadProps {
  currentImageUrl?: string;
  onUpload: (image: UploadedImage) => void;
  onRemove?: () => void;
  folder?: string;
  label?: string;
  className?: string;
}

export const ImageUpload = ({
  currentImageUrl,
  onUpload,
  onRemove,
  folder = 'stocktrack/products',
  label = 'Product Image',
  className = '',
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudinaryConfigured = isCloudinaryConfigured();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to Cloudinary
    setIsUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file, folder);
      onUpload(uploaded);
      setPreview(null); // Clear preview, use actual URL
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setPreview(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onRemove?.();
  };

  const displayUrl = preview || currentImageUrl;

  if (!cloudinaryConfigured) {
    return (
      <div className={`${className}`}>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
          {label}
        </label>
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Cloudinary not configured</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                Add <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_CLOUDINARY_CLOUD_NAME</code> and{' '}
                <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">VITE_CLOUDINARY_UPLOAD_PRESET</code> to your .env file.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
        {label}
      </label>

      {displayUrl ? (
        // Image preview
        <div className="relative group">
          <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <img
              src={displayUrl}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-2 bg-white text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors"
            >
              Replace
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="px-3 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {/* Loading overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 rounded-xl flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-indigo-600" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Uploading...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Upload button
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex flex-col items-center justify-center gap-3 group"
        >
          {isUploading ? (
            <>
              <Loader2 size={32} className="animate-spin text-indigo-600" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Uploading...</span>
            </>
          ) : (
            <>
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                <Upload size={24} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Click to upload image</p>
                <p className="text-xs text-slate-400 mt-1">JPEG, PNG, GIF, WebP up to 10MB</p>
              </div>
            </>
          )}
        </button>
      )}

      {/* Error message */}
      {error && (
        <div className="mt-2 p-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
          <p className="text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle size={14} />
            {error}
          </p>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

// Compact version for transaction attachments
export const AttachmentUpload = ({
  currentUrl,
  currentName,
  onUpload,
  onRemove,
}: {
  currentUrl?: string;
  currentName?: string;
  onUpload: (image: UploadedImage) => void;
  onRemove?: () => void;
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudinaryConfigured = isCloudinaryConfigured();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadToCloudinary(file, 'stocktrack/attachments');
      onUpload(uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!cloudinaryConfigured) {
    return null; // Don't show attachment option if not configured
  }

  return (
    <div className="mt-4">
      <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">
        Attachment (Optional)
      </label>
      
      {currentUrl ? (
        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
          <img src={currentUrl} alt="" className="w-12 h-12 rounded object-cover" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
              {currentName || 'Attachment'}
            </p>
          </div>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded"
            >
              <X size={16} className="text-slate-500" />
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full p-3 border border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors flex items-center justify-center gap-2"
        >
          {isUploading ? (
            <Loader2 size={16} className="animate-spin text-indigo-600" />
          ) : (
            <ImageIcon size={16} className="text-slate-400" />
          )}
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {isUploading ? 'Uploading...' : 'Add receipt or photo'}
          </span>
        </button>
      )}

      {error && (
        <p className="mt-1 text-xs text-rose-500">{error}</p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
