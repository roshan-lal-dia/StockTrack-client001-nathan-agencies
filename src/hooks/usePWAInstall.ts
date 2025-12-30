import { useState, useEffect } from 'react';

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

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // iOS Safari check
      const isIOSInstalled = (navigator as any).standalone === true;
      setIsInstalled(isStandalone || isIOSInstalled);
    };

    checkInstalled();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Save the event so it can be triggered later
      setInstallPrompt(e);
      console.log('PWA install prompt saved');
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('PWA was installed');
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Also check display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!installPrompt) {
      console.log('No install prompt available');
      return false;
    }

    setIsInstalling(true);
    
    try {
      // Show the install prompt
      await installPrompt.prompt();
      
      // Wait for the user to respond
      const { outcome } = await installPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  };

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isInstalling,
    promptInstall,
  };
};
