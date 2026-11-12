import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { createAppTheme, isThemeId, type ThemeId } from './theme';

const STORAGE_KEY = 'briefing.theme';

type ThemePreference = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
};

const ThemePreferenceContext = createContext<ThemePreference | null>(null);

function readStoredTheme(): ThemeId {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isThemeId(stored)) {
      return stored;
    }
  } catch {
    // Storage can be blocked; the default theme still applies.
  }
  return 'jornal';
}

function storeTheme(id: ThemeId): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // The choice still applies for this visit.
  }
}

export function ThemePreferenceProvider({ children }: { children: ReactNode }) {
  const [themeId, setThemeIdState] = useState<ThemeId>(readStoredTheme);
  const theme = useMemo(() => createAppTheme(themeId), [themeId]);
  const value = useMemo<ThemePreference>(
    () => ({
      themeId,
      setThemeId: (id: ThemeId) => {
        setThemeIdState(id);
        storeTheme(id);
      },
    }),
    [themeId],
  );

  return (
    <ThemePreferenceContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        {children}
      </ThemeProvider>
    </ThemePreferenceContext.Provider>
  );
}

export function useThemePreference(): ThemePreference {
  const value = useContext(ThemePreferenceContext);
  if (!value) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return value;
}
