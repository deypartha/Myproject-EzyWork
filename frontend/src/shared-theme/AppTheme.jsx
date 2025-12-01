import React, { createContext, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

export const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'light' });

export default function AppTheme({ children }) {
  const [mode, setMode] = useState('light');

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
      mode,
    }),
    [mode]
  );

  const theme = useMemo(() => {
    const base = createTheme({ palette: { mode } });
    // helper used by the existing code. Returns `styles` only when `mode` matches `targetMode`.
    base.applyStyles = (targetMode, styles) => (mode === targetMode ? styles : {});
    return base;
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </ColorModeContext.Provider>
  );
}
