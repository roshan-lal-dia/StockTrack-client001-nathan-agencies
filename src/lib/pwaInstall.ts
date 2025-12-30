// Global storage for the install prompt - captures it even before React mounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptListeners: Set<(prompt: BeforeInstallPromptEvent | null) => void> = new Set();
let promptEventFired = false;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

// Debug logging helper
const logPWA = (message: string, data?: unknown) => {
  const timestamp = new Date().toISOString().split('T')[1];
  if (data) {
    console.log(`[PWA ${timestamp}] ${message}`, data);
  } else {
    console.log(`[PWA ${timestamp}] ${message}`);
  }
};

// Initialize immediately when this module loads (before React)
if (typeof window !== 'undefined') {
  logPWA('Module initializing, setting up event listeners');
  
  // Handler for beforeinstallprompt
  const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
    logPWA('beforeinstallprompt event CAPTURED!', { platforms: e.platforms });
    e.preventDefault();
    deferredPrompt = e;
    promptEventFired = true;
    // Notify all listeners
    installPromptListeners.forEach(listener => listener(e));
  };
  
  // Add listener immediately
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

  window.addEventListener('appinstalled', () => {
    logPWA('App was installed!');
    deferredPrompt = null;
    installPromptListeners.forEach(listener => listener(null));
  });

  // Also check if service worker is ready
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      logPWA('Service worker is ready');
    }).catch((err) => {
      logPWA('Service worker error:', err);
    });
  }
  
  // Log PWA-related info for debugging
  logPWA('Platform info:', {
    userAgent: navigator.userAgent,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
    iosStandalone: (navigator as any).standalone,
  });
}

// Check if the prompt event was captured
export const wasPromptEventFired = () => promptEventFired;

// Helper to detect platform
export const getPlatformInfo = () => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua) || /CriOS/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  const isFirefox = /Firefox|FxiOS/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);
  const isOpera = /OPR|Opera/.test(ua);
  const isInAppBrowser = /FBAN|FBAV|Instagram|Twitter|Line/.test(ua);
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (navigator as any).standalone === true;
  const isMobile = isIOS || isAndroid || /Mobile/.test(ua);
  
  // Check if running in a WebView or in-app browser
  const isWebView = isInAppBrowser || (isAndroid && /wv/.test(ua));
  
  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isEdge,
    isFirefox,
    isSamsung,
    isOpera,
    isWebView,
    isInAppBrowser,
    isMobile,
    isInstalled: isStandalone || isIOSStandalone,
    // These browsers support beforeinstallprompt (but iOS Chrome still can't use it)
    supportsInstallPrompt: !isIOS && !isWebView && (isChrome || isEdge || isSamsung || isOpera),
    browser: isSamsung ? 'Samsung Internet' :
             isChrome ? 'Chrome' : 
             isEdge ? 'Edge' : 
             isSafari ? 'Safari' : 
             isFirefox ? 'Firefox' : 
             isOpera ? 'Opera' : 
             isInAppBrowser ? 'In-App Browser' :
             'Unknown',
    // Debug info
    ua: ua.substring(0, 100)
  };
};

// Get the install prompt (might have been captured before React mounted)
export const getDeferredPrompt = () => deferredPrompt;

// Subscribe to prompt changes
export const subscribeToPrompt = (listener: (prompt: BeforeInstallPromptEvent | null) => void) => {
  installPromptListeners.add(listener);
  return () => installPromptListeners.delete(listener);
};

// Trigger the install prompt
export const triggerInstallPrompt = async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available');
    return 'unavailable';
  }

  try {
    console.log('[PWA] Triggering install prompt');
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User choice: ${outcome}`);
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
    }
    
    return outcome;
  } catch (error) {
    console.error('[PWA] Error triggering prompt:', error);
    return 'unavailable';
  }
};

// Get install instructions for the current platform
export type InstallInstructions = 
  | { type: 'installed'; title: string; message: string }
  | { type: 'manual'; title: string; steps: string[]; icon: string }
  | { type: 'prompt'; title: string; message: string; fallback: { steps: string[] } }
  | { type: 'unsupported'; title: string; message: string }
  | { type: 'unknown'; title: string; message: string };

export const getInstallInstructions = (): InstallInstructions => {
  const platform = getPlatformInfo();
  
  if (platform.isInstalled) {
    return {
      type: 'installed' as const,
      title: 'App Installed',
      message: 'StockTrack is already installed on your device.'
    };
  }
  
  // Handle in-app browsers (Facebook, Instagram, etc.)
  if (platform.isWebView || platform.isInAppBrowser) {
    return {
      type: 'manual' as const,
      title: 'Open in Browser',
      steps: platform.isIOS ? [
        'Tap the "..." or menu button',
        'Select "Open in Safari"',
        'Then follow Safari installation steps below'
      ] : [
        'Tap the "..." or menu button',
        'Select "Open in Chrome" or "Open in Browser"',
        'Then use Chrome\'s install option'
      ],
      icon: 'menu'
    };
  }
  
  if (platform.isIOS) {
    return {
      type: 'manual' as const,
      title: 'Install on iOS',
      steps: [
        'Tap the Share button (square with arrow) at the bottom of Safari',
        'Scroll down and tap "Add to Home Screen"',
        'Tap "Add" in the top right corner'
      ],
      icon: 'share'
    };
  }
  
  if (platform.isAndroid && platform.isSamsung) {
    return {
      type: 'manual' as const,
      title: 'Install on Samsung Internet',
      steps: [
        'Tap the menu icon (three lines) at the bottom right',
        'Tap "Add page to"',
        'Select "Home screen"'
      ],
      icon: 'menu'
    };
  }
  
  if (platform.isAndroid && platform.isFirefox) {
    return {
      type: 'manual' as const,
      title: 'Install on Firefox',
      steps: [
        'Tap the menu icon (three dots)',
        'Tap "Install"',
        'Follow the prompts to add to home screen'
      ],
      icon: 'menu'
    };
  }
  
  if (platform.isAndroid) {
    return {
      type: 'prompt' as const,
      title: 'Install App',
      message: 'Tap the button below to install StockTrack.',
      fallback: {
        steps: [
          'Tap the menu icon (three dots) at the top right',
          'Tap "Install app" or "Add to Home screen"',
          'Follow the prompts'
        ]
      }
    };
  }
  
  // Desktop browsers
  if (platform.isChrome || platform.isEdge) {
    return {
      type: 'prompt' as const,
      title: 'Install App',
      message: 'Click the button below to install StockTrack.',
      fallback: {
        steps: [
          `Look for the install icon (⊕) in the ${platform.browser} address bar`,
          'Click "Install" when prompted',
          'The app will open in its own window'
        ]
      }
    };
  }
  
  if (platform.isSafari) {
    return {
      type: 'manual' as const,
      title: 'Install on macOS Safari',
      steps: [
        'Click File in the menu bar',
        'Click "Add to Dock..."',
        'Click "Add" to confirm'
      ],
      icon: 'menu'
    };
  }
  
  if (platform.isFirefox) {
    return {
      type: 'unsupported' as const,
      title: 'Firefox Desktop',
      message: 'Firefox on desktop doesn\'t support installing web apps. Try Chrome or Edge for the best experience.'
    };
  }
  
  return {
    type: 'unknown' as const,
    title: 'Install StockTrack',
    message: 'Check your browser\'s menu for an option to install or add to home screen.'
  };
};
