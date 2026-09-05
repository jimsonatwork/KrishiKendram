import {
  useEffect,
  useMemo,
} from 'react'

import {
  useThemeStore,
  type ColourTheme,
  type ThemeMode,
} from '@/stores/theme.store'

function getSystemTheme(): 'light' | 'dark' {
  if (
    typeof window === 'undefined' ||
    !window.matchMedia
  ) {
    return 'light'
  }

  return window.matchMedia(
    '(prefers-color-scheme: dark)',
  ).matches
    ? 'dark'
    : 'light'
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const mode = useThemeStore((state) => state.mode)
  const colourTheme = useThemeStore(
    (state) => state.colourTheme,
  )

  const resolvedMode = useMemo(() => {
    if (mode === 'system') {
      return getSystemTheme()
    }

    return mode
  }, [mode])

  useEffect(() => {
    const root = document.documentElement

    root.classList.remove('light', 'dark')

    root.classList.add(resolvedMode)

    root.classList.remove(
      'theme-ocean',
      'theme-harvest',
      'theme-midnight',
    )

    if (colourTheme !== 'krishi') {
      root.classList.add(
        `theme-${colourTheme}`,
      )
    }
  }, [resolvedMode, colourTheme])

  useEffect(() => {
    if (mode !== 'system') {
      return
    }

    const media = window.matchMedia(
      '(prefers-color-scheme: dark)',
    )

    const handleChange = () => {
      const root = document.documentElement

      root.classList.remove(
        'light',
        'dark',
      )

      root.classList.add(
        getSystemTheme(),
      )
    }

    media.addEventListener(
      'change',
      handleChange,
    )

    return () => {
      media.removeEventListener(
        'change',
        handleChange,
      )
    }
  }, [mode])

  return children
}

export type {
  ColourTheme,
  ThemeMode,
}
