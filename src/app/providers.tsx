'use client';

import { ThemeProvider } from 'next-themes';
import { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="data-theme" defaultTheme="light" forcedTheme="light" enableSystem={false} storageKey="theme-preference">
      {children}
    </ThemeProvider>
  );
}
