import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

/**
 * Apply theme to the document
 */
const applyThemeToDOM = (theme: Theme) => {
  const root = document.documentElement;
  
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } else if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ theme });
      },
    }),
    {
      name: 'stocktrack-theme',
      onRehydrateStorage: () => (state) => {
        // Apply theme when store is rehydrated from localStorage
        if (state) {
          applyThemeToDOM(state.theme);
        }
      },
    }
  )
);

// Initialize theme on app load
export const initializeTheme = () => {
  const { theme } = useThemeStore.getState();
  applyThemeToDOM(theme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme;
    if (currentTheme === 'system') {
      applyThemeToDOM('system');
    }
  });
};
