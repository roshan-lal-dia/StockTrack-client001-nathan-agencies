import { X, ZoomIn, ZoomOut, Download, ExternalLink, RotateCcw, Move } from 'lucide-react';
import { useState, useRef, useCallback, useEffect } from 'react';

interface ImageViewerProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
}

export const ImageViewer = ({ isOpen, onClose, imageUrl, title }: ImageViewerProps) => {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialZoom, setInitialZoom] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImageError(false);
    }
  }, [isOpen]);

  const handleZoomIn = useCallback(() => {
    setZoom(z => Math.min(z + 0.5, 5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const newZoom = Math.max(z - 0.5, 0.5);
      // Reset position if zooming out to fit
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setZoom(z => {
      const newZoom = Math.max(0.5, Math.min(5, z + delta));
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  // Mouse drag for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom > 1) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  }, [zoom, position]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart, zoom]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch handling for pinch-to-zoom and pan
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = getTouchDistance(e.touches);
      setInitialPinchDistance(distance);
      setInitialZoom(zoom);
    } else if (e.touches.length === 1 && zoom > 1) {
      // Pan start
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y
      });
    }
  }, [zoom, position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistance) {
      // Pinch zoom
      e.preventDefault();
      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialPinchDistance;
      const newZoom = Math.max(0.5, Math.min(5, initialZoom * scale));
      setZoom(newZoom);
      if (newZoom <= 1) {
        setPosition({ x: 0, y: 0 });
      }
    } else if (e.touches.length === 1 && isDragging && zoom > 1) {
      // Pan
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  }, [initialPinchDistance, initialZoom, isDragging, dragStart, zoom]);

  const handleTouchEnd = useCallback(() => {
    setInitialPinchDistance(null);
    setIsDragging(false);
  }, []);

  // Double tap to zoom
  const lastTapRef = useRef<number>(0);
  const handleDoubleTap = useCallback((e: React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      e.preventDefault();
      if (zoom > 1) {
        handleReset();
      } else {
        setZoom(2.5);
      }
    }
    lastTapRef.current = now;
  }, [zoom, handleReset]);

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

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col animate-fade-in touch-none"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-3 md:p-4 flex items-center justify-between bg-black/50 backdrop-blur-sm z-10">
        <h3 className="text-white font-medium truncate max-w-[40%] text-sm md:text-base">
          {title || 'Image Preview'}
        </h3>
        <div className="flex items-center gap-1 md:gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="px-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white text-xs md:text-sm font-medium transition-colors min-w-[50px] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={18} />
          </button>
          <div className="w-px h-5 bg-white/20 mx-0.5 hidden md:block" />
          <button
            onClick={(e) => { e.stopPropagation(); handleReset(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors hidden md:flex"
            title="Reset View"
          >
            <RotateCcw size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenNewTab(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors hidden md:flex"
            title="Open in New Tab"
          >
            <ExternalLink size={18} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload(); }}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors hidden md:flex"
            title="Download"
          >
            <Download size={18} />
          </button>
          <div className="w-px h-5 bg-white/20 mx-0.5" />
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 text-white transition-colors"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden flex items-center justify-center ${zoom > 1 ? 'cursor-grab' : 'cursor-zoom-in'} ${isDragging ? 'cursor-grabbing' : ''}`}
        onClick={(e) => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={(e) => { handleTouchStart(e); handleDoubleTap(e); }}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {imageError ? (
          <div className="text-white text-center p-8">
            <p className="text-lg">Failed to load image</p>
            <p className="text-sm text-white/60 mt-2 break-all max-w-md">{imageUrl}</p>
          </div>
        ) : (
          <img
            ref={imageRef}
            src={imageUrl}
            alt={title || 'Preview'}
            className="max-w-full max-h-full object-contain select-none"
            style={{ 
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onError={() => setImageError(true)}
            draggable={false}
          />
        )}
      </div>

      {/* Footer hints */}
      <div className="flex-shrink-0 p-3 flex items-center justify-center gap-4 text-white/40 text-xs bg-black/50">
        <span className="hidden md:inline">Scroll to zoom</span>
        <span className="hidden md:inline">•</span>
        <span className="hidden md:inline">{zoom > 1 ? 'Drag to pan' : 'Click outside to close'}</span>
        <span className="md:hidden">Pinch to zoom • Double-tap to reset</span>
        {zoom > 1 && <span className="flex items-center gap-1"><Move size={12} /> Drag to pan</span>}
      </div>
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
