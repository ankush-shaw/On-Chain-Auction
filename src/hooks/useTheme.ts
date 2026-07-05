import { useLayoutEffect, useState } from 'react';

export function useTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Read from localStorage; default to dark
    const stored = localStorage.getItem('theme');
    return stored !== 'light';
  });

  // useLayoutEffect fires synchronously before browser paint, so there's
  // no flicker and the dark class is always in sync with React state.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((prev) => !prev) };
}
