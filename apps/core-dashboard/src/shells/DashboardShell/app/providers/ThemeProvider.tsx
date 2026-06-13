/**
 * ThemeProvider.tsx
 * Proveedor de tema base del shell (fallback/defaults).
 * 
 * Este provider aplica el tema base del shell cuando no hay
 * configuración remota disponible. El OrchestratorProvider
 * inyecta tokens CSS personalizados que sobrescriben estos valores.
 */

import React, { createContext, useContext } from 'react';

interface ThemeContextValue {
  // El tema base se define en theme.css
  // Este contexto puede extenderse en el futuro si se necesita
}

const ThemeContext = createContext<ThemeContextValue>({});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <ThemeContext.Provider value={{}}>
      {children}
    </ThemeContext.Provider>
  );
}
