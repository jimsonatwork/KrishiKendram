import { Monitor, Moon, Palette, Settings2, Sparkles, Sun, Zap } from 'lucide-react'
import { useThemeStore, type ColourTheme, type ThemeMode } from '@/stores/theme.store'

const modes: Array<[ThemeMode, string, typeof Monitor]> = [
  ['system', 'System', Monitor],
  ['light', 'Light', Sun],
  ['dark', 'Dark', Moon],
]

const themes: Array<[ColourTheme, string]> = [
  ['krishi', 'Krishi'],
  ['ocean', 'Ocean'],
  ['harvest', 'Harvest'],
  ['midnight', 'Midnight'],
]

export function SystemPage() {
  const mode = useThemeStore((s) => s.mode)
  const colourTheme = useThemeStore((s) => s.colourTheme)
  const visualEffects = useThemeStore((s) => s.visualEffects)
  const setMode = useThemeStore((s) => s.setMode)
  const setColourTheme = useThemeStore((s) => s.setColourTheme)
  const setVisualEffects = useThemeStore((s) => s.setVisualEffects)

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Platform control</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">System</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Workspace preferences and device-friendly visual controls. These settings are local and do not alter authorization or business data.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Palette className="size-5" /></div>
            <div><h2 className="font-semibold">Appearance</h2><p className="text-sm text-muted-foreground">Choose how KrishiKendram looks on this device.</p></div>
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Mode</div>
            <div className="grid grid-cols-3 gap-2">
              {modes.map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setMode(value)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm transition ${mode === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`} aria-pressed={mode === value}><Icon className="size-4" />{label}</button>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Colour theme</div>
            <div className="grid grid-cols-2 gap-2">
              {themes.map(([value, label]) => (
                <button key={value} type="button" onClick={() => setColourTheme(value)} className={`rounded-xl border px-4 py-3 text-left text-sm transition ${colourTheme === value ? 'border-primary bg-primary/10 text-primary' : 'hover:bg-muted'}`} aria-pressed={colourTheme === value}>
                  <div className="font-medium">{label}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{value === 'krishi' ? 'Natural green workspace' : value === 'ocean' ? 'Cool blue workspace' : value === 'harvest' ? 'Warm agricultural workspace' : 'Deep high-contrast workspace'}</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Settings2 className="size-5" /></div>
            <div><h2 className="font-semibold">Performance & accessibility</h2><p className="text-sm text-muted-foreground">Keep the visual layer appropriate for the device.</p></div>
          </div>
          <div className="mt-6 rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3"><Sparkles className="mt-0.5 size-5 text-primary" /><div><div className="font-medium">Visual effects</div><p className="mt-1 text-sm leading-6 text-muted-foreground">Ambient motion, glow and depth effects can be disabled. Reduced-motion preferences automatically take precedence.</p></div></div>
              <button type="button" role="switch" aria-checked={visualEffects} onClick={() => setVisualEffects(!visualEffects)} className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${visualEffects ? 'bg-primary' : 'bg-muted-foreground/30'}`} title="Toggle visual effects"><span className={`absolute top-1 size-4 rounded-full bg-white shadow-sm transition-transform ${visualEffects ? 'translate-x-6' : 'translate-x-1'}`} /></button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium"><Zap className="size-4 text-primary" />Effects state</div><div className="mt-2 text-sm text-muted-foreground">{visualEffects ? 'Enabled' : 'Reduced'}</div></div>
            <div className="rounded-xl border p-4"><div className="flex items-center gap-2 text-sm font-medium"><Monitor className="size-4 text-primary" />Theme mode</div><div className="mt-2 text-sm capitalize text-muted-foreground">{mode}</div></div>
          </div>
          <div className="mt-5 rounded-xl border border-dashed p-4 text-xs leading-5 text-muted-foreground">Presentation-only settings. Authorization, audit, lifecycle and business records remain governed by canonical backend contracts.</div>
        </section>
      </div>
    </div>
  )
}
