import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'light' | 'dark' | 'system'

export type ColourTheme =
  | 'krishi'
  | 'ocean'
  | 'harvest'
  | 'midnight'

type ThemeState = {
  mode: ThemeMode
  colourTheme: ColourTheme
  setMode: (mode: ThemeMode) => void
  setColourTheme: (theme: ColourTheme) => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'system',
      colourTheme: 'krishi',

      setMode: (mode) => set({ mode }),

      setColourTheme: (colourTheme) =>
        set({ colourTheme }),
    }),
    {
      name: 'krishikendram-theme',
    },
  ),
)
