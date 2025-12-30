import { X, ZoomIn, ZoomOut, Download, ExternalLink } from 'lucide-react';
import { useState } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImageViewer = ({ isOpen, onClose, imageUrl, title }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.5));
  const handleReset = () => setZoom(1);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = title || 'image';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-black/50 to-transparent">
        <h3 className="text-white font-medium truncate max-w-md">
          {title || 'Image Preview'}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={20} />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenNewTab(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Open in New Tab"
          >
            <ExternalLink size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Download"
          >
            <Download size={20} />
          </button>
          <div className="w-px h-6 bg-white/20 mx-1" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        className="overflow-auto max-w-full max-h-full p-16"
        onClick={(e) => e.stopPropagation()}
      >
        {imageError ? (
          <div className="text-white text-center">
            <p className="text-lg">Failed to load image</p>
            <p className="text-sm text-white/60 mt-2">{imageUrl}</p>
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={title || 'Preview'}
            className="max-w-none transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
            onError={() => setImageError(true)}
          />
        )}
      </div>

      {/* Click hint */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/40 text-sm">
        Click outside to close • Scroll to zoom
      </p>
    </div>
  );
};

// Thumbnail component for use in lists
interface ImageThumbnailProps {
  imageUrl?: string;
  thumbnailUrl?: string;
  alt: string;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const ImageThumbnail = ({ imageUrl, thumbnailUrl, alt, onClick, size = 'md' }: ImageThumbnailProps) => {
  const [error, setError] = useState(false);
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const src = thumbnailUrl || imageUrl;

  if (!src || error) {
    // Placeholder
    return (
      <div 
        className={`${sizeClasses[size]} rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 dark:text-slate-500 flex-shrink-0`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${sizeClasses[size]} rounded-lg overflow-hidden flex-shrink-0 border-2 border-transparent hover:border-indigo-500 transition-all hover:shadow-lg cursor-pointer group relative`}
      title="Click to view full image"
    >
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <ZoomIn size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </button>
  );
};
