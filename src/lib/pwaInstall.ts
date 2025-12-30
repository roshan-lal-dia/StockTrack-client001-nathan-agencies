// Global storage for the install prompt - captures it even before React mounts
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installPromptListeners: Set<(prompt: BeforeInstallPromptEvent | null) => void> = new Set();

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

// Initialize immediately when this module loads (before React)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
    console.log('[PWA] beforeinstallprompt event captured globally');
    e.preventDefault();
    deferredPrompt = e;
    // Notify all listeners
    installPromptListeners.forEach(listener => listener(e));
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    installPromptListeners.forEach(listener => listener(null));
  });
}

// Helper to detect platform
export const getPlatformInfo = () => {
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge|Edg/.test(ua);
  const isEdge = /Edge|Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSamsung = /SamsungBrowser/.test(ua);
  const isOpera = /OPR|Opera/.test(ua);
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = (navigator as any).standalone === true;
  
  return {
    isIOS,
    isAndroid,
    isSafari,
    isChrome,
    isEdge,
    isFirefox,
    isSamsung,
    isOpera,
    isMobile: isIOS || isAndroid,
    isInstalled: isStandalone || isIOSStandalone,
    // iOS Safari doesn't support beforeinstallprompt
    supportsInstallPrompt: !isIOS && (isChrome || isEdge || isSamsung || isOpera),
    browser: isChrome ? 'Chrome' : 
             isEdge ? 'Edge' : 
             isSafari ? 'Safari' : 
             isFirefox ? 'Firefox' : 
             isSamsung ? 'Samsung Internet' :
             isOpera ? 'Opera' : 'Unknown'
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
