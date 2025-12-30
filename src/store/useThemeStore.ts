import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  resolvedTheme: 'light' | 'dark';
  setResolvedTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => {
        const current = get().theme;
        const next: Theme = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        set({ theme: next });
      },
      setResolvedTheme: (resolvedTheme) => set({ resolvedTheme }),
    }),
    {
      name: 'stocktrack-theme',
    }
  )
);

// Initialize theme on load
export const initializeTheme = () => {
  const { theme, setResolvedTheme } = useThemeStore.getState();
  
  const applyTheme = (resolved: 'light' | 'dark') => {
    setResolvedTheme(resolved);
    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  if (theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    applyTheme(mediaQuery.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', (e) => {
      if (useThemeStore.getState().theme === 'system') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
  } else {
    applyTheme(theme);
  }
};
