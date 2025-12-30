import { useState, useEffect, useCallback } from 'react';
import { 
  getDeferredPrompt, 
  subscribeToPrompt, 
  triggerInstallPrompt, 
  getPlatformInfo,
  getInstallInstructions,
  wasPromptEventFired
} from '@/lib/pwaInstall';

export const usePWAInstall = () => {
  const [hasPrompt, setHasPrompt] = useState(() => !!getDeferredPrompt());
  const [isInstalled, setIsInstalled] = useState(() => getPlatformInfo().isInstalled);
  const [isInstalling, setIsInstalling] = useState(false);
  const [platformInfo, setPlatformInfo] = useState(() => getPlatformInfo());
  const [instructions, setInstructions] = useState(() => getInstallInstructions());
  const [promptFired, setPromptFired] = useState(() => wasPromptEventFired());

  useEffect(() => {
    // Subscribe to prompt availability changes
    const unsubscribe = subscribeToPrompt((prompt) => {
      setHasPrompt(!!prompt);
      setPromptFired(wasPromptEventFired());
      if (!prompt) {
        // Check if installed after prompt is cleared
        setIsInstalled(getPlatformInfo().isInstalled);
      }
    });

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    // Check again on visibility change (user might have installed from browser UI)
    const handleVisibility = () => {
      if (!document.hidden) {
        const info = getPlatformInfo();
        setIsInstalled(info.isInstalled);
        setHasPrompt(!!getDeferredPrompt());
        setPromptFired(wasPromptEventFired());
        setPlatformInfo(info);
        setInstructions(getInstallInstructions());
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Also re-check after a few seconds (for late-firing prompt events)
    const checkTimer = setTimeout(() => {
      setHasPrompt(!!getDeferredPrompt());
      setPromptFired(wasPromptEventFired());
    }, 3000);

    return () => {
      unsubscribe();
      clearTimeout(checkTimer);
      mediaQuery.removeEventListener('change', handleChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    setIsInstalling(true);
    try {
      const result = await triggerInstallPrompt();
      if (result === 'accepted') {
        setHasPrompt(false);
        // Give time for install to complete
        setTimeout(() => {
          setIsInstalled(getPlatformInfo().isInstalled);
        }, 1000);
      }
      return result;
    } finally {
      setIsInstalling(false);
    }
  }, []);

  return {
    // Can we show the install button with native prompt?
    canPrompt: hasPrompt && !isInstalled,
    // Is the app already installed?
    isInstalled,
    // Is an install in progress?
    isInstalling,
    // Platform information
    platform: platformInfo,
    // Installation instructions for current platform
    instructions,
    // Trigger the install prompt
    promptInstall,
    // Should we show manual instructions?
    showManualInstructions: !hasPrompt && !isInstalled,
    // Debug info
    debug: {
      hasPrompt,
      promptFired,
      supportsInstallPrompt: platformInfo.supportsInstallPrompt,
      isWebView: platformInfo.isWebView,
      isInAppBrowser: platformInfo.isInAppBrowser,
    }
  };
};
