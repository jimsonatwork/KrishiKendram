import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  Activity,
  Archive,
  ArrowRight,
  BarChart3,
  Bell,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  Cloud,
  Database,
  FileClock,
  FileText,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Plus,
  Settings,
  Shield,
  ShieldCheck,
  Sprout,
  Tractor,
  Users,
  Wheat,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'

import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import {
  useAuthStore,
  type AuthUser,
} from '@/stores/auth.store'

/* =========================================================
   TYPES
========================================================= */

type Farm = {
  id: string
  name: string
  type?: string
  location?: string
  area?: number | null
  unit?: string
  assets?: FarmAsset[]
  records?: FarmRecord[]
}

type FarmAsset = {
  id: string
  name?: string
  type?: string
  quantity?: number
  unit?: string
}

type FarmRecord = {
  id: string
  category?: string
  title?: string
  description?: string
}

type Crop = {
  id: string
  farmId?: string
  name: string
  variety?: string
  season?: string
  status?: string
  sowingDate?: string
  harvestDate?: string
  area?: number | null
  unit?: string
  notes?: string
  farm?: {
    id: string
    name: string
  }
}

/* =========================================================
   CONSTANTS
========================================================= */

const cropStatuses = [
  'PLANNED',
  'SOWN',
  'GERMINATED',
  'GROWING',
  'FLOWERING',
  'FRUITING',
  'HARVEST_READY',
  'HARVESTED',
  'FAILED',
  'ARCHIVED',
]

const cropSeasons = [
  'UNKNOWN',
  'KHARIF',
  'RABI',
  'ZAID',
  'PERENNIAL',
]

/* =========================================================
   HELPERS
========================================================= */

function formatEnum(value?: string) {
  if (!value) return '—'

  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(' ')
}

/* =========================================================
   BRAND
========================================================= */

function Brand({
  compact = false,
}: {
  compact?: boolean
}) {
  return (
    <Link
      to="/"
      className="flex items-center gap-3"
    >
      <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <Sprout className="size-5" />
      </div>

      {!compact && (
        <div>
          <div className="font-semibold tracking-tight">
            KrishiKendram
          </div>

          <div className="text-[11px] text-muted-foreground">
            Smart Farm Management
          </div>
        </div>
      )}
    </Link>
  )
}

/* =========================================================
   LANDING
========================================================= */

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Brand />

          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost">
                Sign in
              </Button>
            </Link>

            <Link to="/register">
              <Button>
                Get started
                <ArrowRight />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,var(--primary)/12%,transparent_40%)]" />

          <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6">
            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.5,
              }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs font-medium">
                <span className="size-1.5 rounded-full bg-primary" />
                Smart Farm Management
              </div>

              <h1 className="max-w-3xl text-5xl font-semibold tracking-tight md:text-7xl">
                Your farm.
                <br />
                Your data.
                <br />
                <span className="text-primary">
                  Your intelligence.
                </span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Manage farms, crops, livestock, assets,
                activities and records from one connected
                platform built for modern agriculture.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/register">
                  <Button size="lg">
                    Create your account
                    <ArrowRight />
                  </Button>
                </Link>

                <Link to="/login">
                  <Button
                    variant="outline"
                    size="lg"
                  >
                    Sign in
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div
              initial={{
                opacity: 0,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              transition={{
                duration: 0.6,
                delay: 0.1,
              }}
              className="relative"
            >
              <div className="rounded-3xl border bg-card p-4 shadow-2xl shadow-primary/5">
                <div className="rounded-2xl border bg-muted/30 p-5">
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">
                        Farm intelligence
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Connected operational data
                      </div>
                    </div>

                    <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BarChart3 className="size-5" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <FeatureMiniCard
                      icon={<Wheat />}
                      label="Crops"
                      value="Connected"
                    />

                    <FeatureMiniCard
                      icon={<Tractor />}
                      label="Assets"
                      value="Tracked"
                    />

                    <FeatureMiniCard
                      icon={<Database />}
                      label="Records"
                      value="Centralized"
                    />

                    <FeatureMiniCard
                      icon={<ShieldCheck />}
                      label="Security"
                      value="Authorized"
                    />
                  </div>

                  <div className="mt-3 rounded-xl border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Leaf className="size-4" />
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-medium">
                          Connected farm context
                        </div>

                        <div className="truncate text-xs text-muted-foreground">
                          Land → crops → assets → activities
                        </div>
                      </div>

                      <CheckCircle2 className="ml-auto size-4 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-20 md:px-6">
          <div className="max-w-2xl">
            <div className="text-sm font-medium text-primary">
              One connected system
            </div>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Built around the farm, not isolated modules.
            </h2>

            <p className="mt-3 text-muted-foreground">
              KrishiKendram is designed to connect operational
              information so the system can understand what is
              happening across your farm.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<Sprout />}
              title="Farm operations"
              description="Manage farms, crops, assets and day-to-day operational information."
            />

            <FeatureCard
              icon={<FileClock />}
              title="History & records"
              description="Keep a connected history of observations, activities and events."
            />

            <FeatureCard
              icon={<ShieldCheck />}
              title="Secure by design"
              description="Authorization is enforced by the backend before data reaches the application."
            />
          </div>
        </section>
      </main>
    </div>
  )
}

function FeatureMiniCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
        {icon}
      </div>

      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="mb-5 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </div>

      <h3 className="font-semibold">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

/* =========================================================
   AUTH PAGES
========================================================= */

function AuthPage({
  mode,
}: {
  mode: 'login' | 'register'
}) {
  const navigate = useNavigate()
  const { login, isLoading } = useAuthStore()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const isLogin = mode === 'login'

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')

    try {
      if (isLogin) {
        await login(email, password)
        navigate('/app', {
          replace: true,
        })
        return
      }

      await api.register({
        name,
        email,
        password,
      })

      navigate('/login', {
        replace: true,
      })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isLogin
            ? 'Login failed'
            : 'Registration failed',
      )
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 md:px-6">
          <Brand />
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
        <motion.div
          initial={{
            opacity: 0,
            y: 15,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="w-full max-w-md"
        >
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              {isLogin ? (
                <ShieldCheck className="size-6" />
              ) : (
                <Sprout className="size-6" />
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">
              {isLogin
                ? 'Welcome back'
                : 'Create your account'}
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              {isLogin
                ? 'Sign in to continue to your farm workspace.'
                : 'Start building your connected farm workspace.'}
            </p>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              {!isLogin && (
                <Field
                  label="Name"
                  value={name}
                  onChange={setName}
                  placeholder="Your name"
                  required
                />
              )}

              <Field
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
                required
              />

              <Field
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="••••••••"
                required
                minLength={6}
              />

              {error && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading
                  ? 'Please wait...'
                  : isLogin
                    ? 'Sign in'
                    : 'Create account'}
              </Button>
            </form>

            <div className="mt-6 border-t pt-5 text-center text-sm text-muted-foreground">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    className="font-medium text-primary hover:underline"
                  >
                    Create one
                  </Link>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    className="font-medium text-primary hover:underline"
                  >
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
  minLength,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  minLength?: number
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </div>
  )
}

/* =========================================================
   SESSION GATE
========================================================= */

function SessionGate() {
  const {
    initialize,
    isInitialized,
    isLoading,
    user,
  } = useAuthStore()

  useEffect(() => {
    if (!isInitialized) {
      void initialize()
    }
  }, [initialize, isInitialized])

  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Sprout className="size-6 animate-pulse" />
          </div>

          <p className="text-sm text-muted-foreground">
            Restoring your session...
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    )
  }

  return <PortalLayout user={user} />
}

/* =========================================================
   PORTAL LAYOUT
========================================================= */

type NavItem = {
  label: string
  href: string
  icon: ReactNode
}

function PortalLayout({
  user,
}: {
  user: AuthUser
}) {
  const location = useLocation()
  const { logout } = useAuthStore()

  const [mobileOpen, setMobileOpen] =
    useState(false)

  const isAdmin =
    user.role === 'SUPER_ADMIN'

  const navigation = useMemo<NavItem[]>(
    () =>
      isAdmin
        ? [
            {
              label: 'Platform',
              href: '/app',
              icon: <LayoutDashboard />,
            },
            {
              label: 'Users',
              href: '/app/users',
              icon: <Users />,
            },
            {
              label: 'Roles',
              href: '/app/roles',
              icon: <Shield />,
            },
            {
              label: 'Permissions',
              href: '/app/permissions',
              icon: <ShieldCheck />,
            },
            {
              label: 'Resources',
              href: '/app/resources',
              icon: <Database />,
            },
            {
              label: 'System',
              href: '/app/system',
              icon: <Settings />,
            },
          ]
        : [
            {
              label: 'Dashboard',
              href: '/app',
              icon: <LayoutDashboard />,
            },
            {
              label: 'My Farms',
              href: '/app/farms',
              icon: <Sprout />,
            },
            {
              label: 'Crops',
              href: '/app/crops',
              icon: <Wheat />,
            },
            {
              label: 'Activities',
              href: '/app/activities',
              icon: <Activity />,
            },
            {
              label: 'History',
              href: '/app/history',
              icon: <FileClock />,
            },
            {
              label: 'AI Intake',
              href: '/app/intake',
              icon: <Cloud />,
            },
          ],
    [isAdmin],
  )

  const handleLogout = async () => {
    await logout()
  }

  let content: ReactNode = isAdmin ? (
    <AdminDashboard user={user} />
  ) : (
    <FarmerDashboard user={user} />
  )

  if (location.pathname === '/app/farms') {
    content = <FarmsPage />
  } else if (location.pathname === '/app/crops') {
    content = <CropsPage />
  } else if (
    location.pathname === '/app/activities'
  ) {
    content = <ComingSoon title="Activities" />
  } else if (
    location.pathname === '/app/history'
  ) {
    content = <ComingSoon title="Farm History" />
  } else if (
    location.pathname === '/app/intake'
  ) {
    content = <ComingSoon title="AI Intake" />
  } else if (location.pathname === '/app/users') {
    content = <ComingSoon title="Users" />
  } else if (location.pathname === '/app/roles') {
    content = <ComingSoon title="Roles" />
  } else if (
    location.pathname === '/app/permissions'
  ) {
    content = <ComingSoon title="Permissions" />
  } else if (
    location.pathname === '/app/resources'
  ) {
    content = <ComingSoon title="Resources" />
  } else if (location.pathname === '/app/system') {
    content = <ComingSoon title="System" />
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {mobileOpen && (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 md:hidden"
          onClick={() =>
            setMobileOpen(false)
          }
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background transition-transform md:translate-x-0 ${
          mobileOpen
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center border-b px-5">
          <Brand />

          <Button
            variant="ghost"
            size="icon"
            className="ml-auto md:hidden"
            onClick={() =>
              setMobileOpen(false)
            }
          >
            <X />
          </Button>
        </div>

        <div className="border-b px-5 py-4">
          <div className="rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {isAdmin ? (
                  <ShieldCheck className="size-5" />
                ) : (
                  <CircleUserRound className="size-5" />
                )}
              </div>

              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {user.name}
                </div>

                <div className="truncate text-xs text-muted-foreground">
                  {formatEnum(user.role)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          <div className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {isAdmin
              ? 'Platform control'
              : 'Farm workspace'}
          </div>

          {navigation.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/app'}
              onClick={() =>
                setMobileOpen(false)
              }
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`
              }
            >
              <span className="[&_svg]:size-[18px]">
                {item.icon}
              </span>

              {item.label}

              <ChevronRight className="ml-auto size-4 opacity-40" />
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
            onClick={handleLogout}
          >
            <LogOut />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="min-h-screen md:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() =>
              setMobileOpen(true)
            }
          >
            <Menu />
          </Button>

          <div className="hidden md:block">
            <div className="text-sm font-medium">
              {isAdmin
                ? 'Platform administration'
                : 'Farm workspace'}
            </div>

            <div className="text-xs text-muted-foreground">
              Secure operational workspace
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
            >
              <Bell />
            </Button>

            <div className="hidden text-right sm:block">
              <div className="text-sm font-medium">
                {user.name}
              </div>

              <div className="text-xs text-muted-foreground">
                {formatEnum(user.role)}
              </div>
            </div>

            <div className="flex size-9 items-center justify-center rounded-full border bg-muted">
              <CircleUserRound className="size-5" />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1600px] p-4 md:p-8">
          {content}
        </main>
      </div>
    </div>
  )
}

/* =========================================================
   FARMER DASHBOARD
========================================================= */

function FarmerDashboard({
  user,
}: {
  user: AuthUser
}) {
  const [farms, setFarms] = useState<Farm[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token =
      localStorage.getItem('accessToken')

    if (!token) return

    Promise.all([
      api.farms(token),
      api.crops(token),
    ])
      .then(([farmResult, cropResult]) => {
        setFarms(farmResult)
        setCrops(cropResult)
      })
      .catch(() => {
        setFarms([])
        setCrops([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const assetCount = farms.reduce(
    (total, farm) =>
      total + (farm.assets?.length ?? 0),
    0,
  )

  const recordCount = farms.reduce(
    (total, farm) =>
      total + (farm.records?.length ?? 0),
    0,
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Farm workspace"
        title={`Good day, ${user.name}`}
        description="Here is the current picture of your farm operations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Sprout />}
          label="Farms"
          value={loading ? '—' : String(farms.length)}
          href="/app/farms"
        />

        <MetricCard
          icon={<Wheat />}
          label="Crops"
          value={loading ? '—' : String(crops.length)}
          href="/app/crops"
        />

        <MetricCard
          icon={<Package />}
          label="Assets"
          value={loading ? '—' : String(assetCount)}
          href="/app/farms"
        />

        <MetricCard
          icon={<FileText />}
          label="Records"
          value={loading ? '—' : String(recordCount)}
          href="/app/history"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-semibold">
                Farm overview
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Your connected farm entities.
              </p>
            </div>

            <Link to="/app/farms">
              <Button
                variant="outline"
                size="sm"
              >
                View farms
                <ArrowRight />
              </Button>
            </Link>
          </div>

          <div className="mt-6 space-y-3">
            {farms.length === 0 ? (
              <EmptyState
                icon={<Sprout />}
                title="No farms yet"
                description="Create your first farm to start building your operational context."
                action={
                  <Link to="/app/farms">
                    <Button>
                      <Plus />
                      Add farm
                    </Button>
                  </Link>
                }
              />
            ) : (
              farms.slice(0, 4).map((farm) => (
                <div
                  key={farm.id}
                  className="flex items-center gap-4 rounded-xl border p-4"
                >
                  <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sprout className="size-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {farm.name}
                    </div>

                    <div className="mt-1 text-xs text-muted-foreground">
                      {farm.location ||
                        'Location not specified'}
                      {farm.area !== null &&
                      farm.area !== undefined
                        ? ` · ${farm.area} ${farm.unit || ''}`
                        : ''}
                    </div>
                  </div>

                  <ChevronRight className="size-4 text-muted-foreground" />
                </div>
              ))
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Cloud className="size-5" />
            </div>

            <div>
              <h2 className="font-semibold">
                Intelligence
              </h2>

              <p className="text-sm text-muted-foreground">
                Connected farm context
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />

              <div>
                <div className="text-sm font-medium">
                  Data foundation ready
                </div>

                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Farms, crops, assets and records can form
                  the operational context used by future
                  KrishiKendram intelligence features.
                </p>
              </div>
            </div>
          </div>

          <Link to="/app/intake">
            <Button
              variant="outline"
              className="mt-4 w-full"
            >
              Open AI Intake
              <ArrowRight />
            </Button>
          </Link>
        </section>
      </div>
    </div>
  )
}

/* =========================================================
   ADMIN DASHBOARD
========================================================= */

function AdminDashboard({
  user,
}: {
  user: AuthUser
}) {
  const adminCards = [
    {
      label: 'Users',
      description:
        'Manage platform users and account status.',
      icon: <Users />,
      href: '/app/users',
    },
    {
      label: 'Roles',
      description:
        'Define platform role structure.',
      icon: <Shield />,
      href: '/app/roles',
    },
    {
      label: 'Permissions',
      description:
        'Control resource-level authorization.',
      icon: <ShieldCheck />,
      href: '/app/permissions',
    },
    {
      label: 'Resources',
      description:
        'Inspect registered platform resources.',
      icon: <Database />,
      href: '/app/resources',
    },
  ]

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Platform control"
        title="Super Admin"
        description={`Welcome, ${user.name}. Manage the KrishiKendram platform from one secure control surface.`}
      />

      <div className="rounded-2xl border bg-card p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-center">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <ShieldCheck className="size-6" />
          </div>

          <div className="flex-1">
            <div className="font-semibold">
              Platform authorization
            </div>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
              Administrative controls are separated from
              farmer operations. The backend remains the
              authoritative security boundary for every
              protected resource.
            </p>
          </div>

          <div className="rounded-xl border bg-muted/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Current role
            </div>

            <div className="mt-1 text-sm font-semibold">
              {formatEnum(user.role)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            to={card.href}
            className="group rounded-2xl border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
                {card.icon}
              </div>

              <div className="flex-1">
                <div className="font-semibold">
                  {card.label}
                </div>

                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  {card.description}
                </p>
              </div>

              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <AdminStatusCard
          icon={<Database />}
          title="Resource registry"
          value="Ready"
        />

        <AdminStatusCard
          icon={<ShieldCheck />}
          title="Authorization"
          value="Centralized"
        />

        <AdminStatusCard
          icon={<Activity />}
          title="Platform status"
          value={formatEnum(user.status)}
        />
      </div>
    </div>
  )
}

function AdminStatusCard({
  icon,
  title,
  value,
}: {
  icon: ReactNode
  title: string
  value: string
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">
          {icon}
        </div>

        <div>
          <div className="text-xs text-muted-foreground">
            {title}
          </div>

          <div className="mt-1 text-sm font-semibold">
            {value}
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PAGE COMPONENTS
========================================================= */

function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && (
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            {eyebrow}
          </div>
        )}

        <h1 className="text-3xl font-semibold tracking-tight">
          {title}
        </h1>

        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {action}
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
          {icon}
        </div>

        <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
      </div>

      <div className="mt-6 text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-3xl font-semibold tracking-tight">
        {value}
      </div>
    </Link>
  )
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed p-8 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">
        {icon}
      </div>

      <h3 className="mt-4 font-medium">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
        {description}
      </p>

      {action && (
        <div className="mt-5">
          {action}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   FARMS
========================================================= */

function FarmsPage() {
  const token =
    localStorage.getItem('accessToken')

  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] =
    useState(false)

  const [editingFarm, setEditingFarm] =
    useState<Farm | null>(null)

  const [name, setName] = useState('')
  const [type, setType] =
    useState('AGRICULTURE_DAIRY')
  const [location, setLocation] = useState('')
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState('acre')

  const loadFarms = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const result = await api.farms(token)
      setFarms(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load farms',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadFarms()
  }, [])

  const resetForm = () => {
    setName('')
    setType('AGRICULTURE_DAIRY')
    setLocation('')
    setArea('')
    setUnit('acre')
    setEditingFarm(null)
    setShowForm(false)
  }

  const submitFarm = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token) return

    try {
      const data = {
        name,
        type,
        location: location || undefined,
        area: area
          ? Number(area)
          : undefined,
        unit: unit || undefined,
      }

      if (editingFarm) {
        await api.updateFarm(
          editingFarm.id,
          data,
          token,
        )
      } else {
        await api.createFarm(
          data,
          token,
        )
      }

      resetForm()
      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save farm',
      )
    }
  }

  const editFarm = (farm: Farm) => {
    setEditingFarm(farm)
    setName(farm.name || '')
    setType(
      farm.type || 'AGRICULTURE_DAIRY',
    )
    setLocation(farm.location || '')
    setArea(
      farm.area !== null &&
      farm.area !== undefined
        ? String(farm.area)
        : '',
    )
    setUnit(farm.unit || 'acre')
    setShowForm(true)
  }

  const deleteFarm = async (
    farmId: string,
  ) => {
    if (!token) return

    if (
      !window.confirm(
        'Are you sure you want to delete this farm?',
      )
    ) {
      return
    }

    try {
      await api.deleteFarm(
        farmId,
        token,
      )

      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to delete farm',
      )
    }
  }

  if (loading) {
    return <LoadingState label="Loading farms..." />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Farm operations"
        title="My Farms"
        description="Manage your farms and the operational data connected to them."
        action={
          <Button
            onClick={() =>
              setShowForm((value) => !value)
            }
          >
            <Plus />
            {showForm ? 'Cancel' : 'Add farm'}
          </Button>
        }
      />

      {error && <ErrorMessage message={error} />}

      {showForm && (
        <motion.form
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          onSubmit={submitFarm}
          className="rounded-2xl border bg-card p-6"
        >
          <h2 className="font-semibold">
            {editingFarm
              ? 'Edit farm'
              : 'Create farm'}
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="Farm name"
              value={name}
              onChange={setName}
              placeholder="Jinse Agro Farm"
              required
            />

            <SelectField
              label="Farm type"
              value={type}
              onChange={setType}
              options={[
                [
                  'AGRICULTURE_DAIRY',
                  'Agriculture + Dairy',
                ],
                ['AGRICULTURE', 'Agriculture'],
                ['LIVESTOCK', 'Livestock'],
                ['DAIRY', 'Dairy'],
                ['POULTRY', 'Poultry'],
                ['MIXED', 'Mixed'],
              ]}
            />

            <Field
              label="Location"
              value={location}
              onChange={setLocation}
              placeholder="Hyderabad"
            />

            <Field
              label="Area"
              type="number"
              value={area}
              onChange={setArea}
              placeholder="5"
            />

            <Field
              label="Area unit"
              value={unit}
              onChange={setUnit}
              placeholder="acre"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <Button type="submit">
              {editingFarm
                ? 'Update farm'
                : 'Create farm'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {farms.length === 0 ? (
        <EmptyState
          icon={<Sprout />}
          title="No farms yet"
          description="Create your first farm to start managing crops, assets and records."
          action={
            <Button
              onClick={() =>
                setShowForm(true)
              }
            >
              <Plus />
              Add your first farm
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {farms.map((farm) => (
            <motion.div
              key={farm.id}
              layout
              className="overflow-hidden rounded-2xl border bg-card"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Sprout className="size-5" />
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate font-semibold">
                        {farm.name}
                      </h2>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {formatEnum(farm.type)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        editFarm(farm)
                      }
                    >
                      Edit
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteFarm(farm.id)
                      }
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4">
                  <InfoItem
                    label="Location"
                    value={
                      farm.location || 'Not specified'
                    }
                  />

                  <InfoItem
                    label="Area"
                    value={
                      farm.area !== null &&
                      farm.area !== undefined
                        ? `${farm.area} ${farm.unit || ''}`
                        : 'Not specified'
                    }
                  />
                </div>
              </div>

              <div className="grid border-t bg-muted/20 md:grid-cols-2">
                <FarmSubsection
                  icon={<Package />}
                  title="Assets"
                  count={
                    farm.assets?.length ?? 0
                  }
                />

                <FarmSubsection
                  icon={<FileText />}
                  title="Records"
                  count={
                    farm.records?.length ?? 0
                  }
                />
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function FarmSubsection({
  icon,
  title,
  count,
}: {
  icon: ReactNode
  title: string
  count: number
}) {
  return (
    <div className="flex items-center gap-3 p-5">
      <div className="flex size-9 items-center justify-center rounded-lg border bg-background text-muted-foreground [&_svg]:size-4">
        {icon}
      </div>

      <div>
        <div className="text-sm font-medium">
          {title}
        </div>

        <div className="text-xs text-muted-foreground">
          {count} {count === 1 ? 'item' : 'items'}
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   CROPS
========================================================= */

function CropsPage() {
  const token =
    localStorage.getItem('accessToken')

  const [crops, setCrops] = useState<Crop[]>([])
  const [farms, setFarms] = useState<Farm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] =
    useState(false)
  const [editingCrop, setEditingCrop] =
    useState<Crop | null>(null)

  const [farmId, setFarmId] = useState('')
  const [name, setName] = useState('')
  const [variety, setVariety] = useState('')
  const [season, setSeason] = useState('UNKNOWN')
  const [status, setStatus] = useState('PLANNED')
  const [sowingDate, setSowingDate] =
    useState('')
  const [harvestDate, setHarvestDate] =
    useState('')
  const [area, setArea] = useState('')
  const [unit, setUnit] = useState('acre')
  const [notes, setNotes] = useState('')

  const loadData = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [cropResult, farmResult] =
        await Promise.all([
          api.crops(token),
          api.farms(token),
        ])

      setCrops(cropResult)
      setFarms(farmResult)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load crops',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const resetForm = () => {
    setFarmId('')
    setName('')
    setVariety('')
    setSeason('UNKNOWN')
    setStatus('PLANNED')
    setSowingDate('')
    setHarvestDate('')
    setArea('')
    setUnit('acre')
    setNotes('')
    setEditingCrop(null)
    setShowForm(false)
  }

  const submitCrop = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token) return

    try {
      const data = {
        farmId,
        name,
        variety: variety || undefined,
        season,
        status,
        sowingDate:
          sowingDate || undefined,
        harvestDate:
          harvestDate || undefined,
        area: area
          ? Number(area)
          : undefined,
        unit: unit || undefined,
        notes: notes || undefined,
      }

      if (editingCrop) {
        await api.updateCrop(
          editingCrop.id,
          data,
          token,
        )
      } else {
        await api.createCrop(
          data,
          token,
        )
      }

      resetForm()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save crop',
      )
    }
  }

  const editCrop = (crop: Crop) => {
    setEditingCrop(crop)
    setFarmId(
      crop.farmId ||
        crop.farm?.id ||
        '',
    )
    setName(crop.name || '')
    setVariety(crop.variety || '')
    setSeason(crop.season || 'UNKNOWN')
    setStatus(crop.status || 'PLANNED')
    setSowingDate(
      crop.sowingDate
        ? String(
            crop.sowingDate,
          ).slice(0, 10)
        : '',
    )
    setHarvestDate(
      crop.harvestDate
        ? String(
            crop.harvestDate,
          ).slice(0, 10)
        : '',
    )
    setArea(
      crop.area !== null &&
      crop.area !== undefined
        ? String(crop.area)
        : '',
    )
    setUnit(crop.unit || 'acre')
    setNotes(crop.notes || '')
    setShowForm(true)
  }

  const archiveCrop = async (
    cropId: string,
  ) => {
    if (!token) return

    if (
      !window.confirm(
        'Are you sure you want to archive this crop?',
      )
    ) {
      return
    }

    try {
      await api.deleteCrop(
        cropId,
        token,
      )

      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to archive crop',
      )
    }
  }

  if (loading) {
    return <LoadingState label="Loading crops..." />
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Crop operations"
        title="Crops"
        description="Track cultivation across your connected farms."
        action={
          <Button
            onClick={() =>
              setShowForm((value) => !value)
            }
          >
            <Plus />
            {showForm ? 'Cancel' : 'Add crop'}
          </Button>
        }
      />

      {error && <ErrorMessage message={error} />}

      {showForm && (
        <motion.form
          initial={{
            opacity: 0,
            y: -8,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          onSubmit={submitCrop}
          className="rounded-2xl border bg-card p-6"
        >
          <h2 className="font-semibold">
            {editingCrop
              ? 'Edit crop'
              : 'Add crop'}
          </h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <SelectField
              label="Farm"
              value={farmId}
              onChange={setFarmId}
              options={farms.map(
                (farm) => [
                  farm.id,
                  farm.name,
                ],
              )}
              placeholder="Select farm"
            />

            <Field
              label="Crop name"
              value={name}
              onChange={setName}
              placeholder="Rice"
              required
            />

            <Field
              label="Variety"
              value={variety}
              onChange={setVariety}
              placeholder="BPT 5204"
            />

            <SelectField
              label="Season"
              value={season}
              onChange={setSeason}
              options={cropSeasons.map(
                (item) => [
                  item,
                  formatEnum(item),
                ],
              )}
            />

            <SelectField
              label="Status"
              value={status}
              onChange={setStatus}
              options={cropStatuses.map(
                (item) => [
                  item,
                  formatEnum(item),
                ],
              )}
            />

            <Field
              label="Area"
              type="number"
              value={area}
              onChange={setArea}
              placeholder="2.5"
            />

            <Field
              label="Area unit"
              value={unit}
              onChange={setUnit}
              placeholder="acre"
            />

            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Sowing date"
                type="date"
                value={sowingDate}
                onChange={setSowingDate}
              />

              <Field
                label="Harvest date"
                type="date"
                value={harvestDate}
                onChange={setHarvestDate}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(event.target.value)
              }
              rows={4}
              placeholder="Crop observations or notes..."
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-5 flex gap-2">
            <Button type="submit">
              {editingCrop
                ? 'Update crop'
                : 'Create crop'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
            >
              Cancel
            </Button>
          </div>
        </motion.form>
      )}

      {crops.length === 0 ? (
        <EmptyState
          icon={<Wheat />}
          title="No crops yet"
          description="Add your first crop to start tracking cultivation."
          action={
            <Button
              onClick={() =>
                setShowForm(true)
              }
            >
              <Plus />
              Add your first crop
            </Button>
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2">
          {crops.map((crop) => (
            <motion.div
              key={crop.id}
              layout
              className="rounded-2xl border bg-card p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Wheat className="size-5" />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {crop.name}
                    </h2>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {crop.farm?.name ||
                        farms.find(
                          (farm) =>
                            farm.id ===
                            crop.farmId,
                        )?.name ||
                        'Unknown farm'}
                    </p>
                  </div>
                </div>

                <span className="rounded-full border bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                  {formatEnum(crop.status)}
                </span>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-5">
                <InfoItem
                  label="Variety"
                  value={
                    crop.variety || 'Not specified'
                  }
                />

                <InfoItem
                  label="Season"
                  value={formatEnum(crop.season)}
                />

                <InfoItem
                  label="Area"
                  value={
                    crop.area !== null &&
                    crop.area !== undefined
                      ? `${crop.area} ${crop.unit || ''}`
                      : 'Not specified'
                  }
                />

                <InfoItem
                  label="Sowing"
                  value={
                    crop.sowingDate
                      ? String(
                          crop.sowingDate,
                        ).slice(0, 10)
                      : 'Not specified'
                  }
                />

                <InfoItem
                  label="Harvest"
                  value={
                    crop.harvestDate
                      ? String(
                          crop.harvestDate,
                        ).slice(0, 10)
                      : 'Not specified'
                  }
                />
              </div>

              {crop.notes && (
                <div className="mt-5 rounded-xl border bg-muted/30 p-4">
                  <div className="text-xs font-medium text-muted-foreground">
                    Notes
                  </div>

                  <div className="mt-1 text-sm leading-6">
                    {crop.notes}
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    editCrop(crop)
                  }
                >
                  Edit
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() =>
                    archiveCrop(crop.id)
                  }
                >
                  <Archive />
                  Archive
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

/* =========================================================
   SHARED FORM COMPONENTS
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[][]
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">
        {label}
      </label>

      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        {placeholder && (
          <option value="">
            {placeholder}
          </option>
        )}

        {options.map(([optionValue, labelText]) => (
          <option
            key={optionValue}
            value={optionValue}
          >
            {labelText}
          </option>
        ))}
      </select>
    </div>
  )
}

function InfoItem({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">
        {label}
      </div>

      <div className="mt-1 text-sm font-medium">
        {value}
      </div>
    </div>
  )
}

function ErrorMessage({
  message,
}: {
  message: string
}) {
  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      {message}
    </div>
  )
}

function LoadingState({
  label,
}: {
  label: string
}) {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <div className="text-sm text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

/* =========================================================
   COMING SOON
========================================================= */

function ComingSoon({
  title,
}: {
  title: string
}) {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="KrishiKendram"
        title={title}
        description="This workspace is reserved for the next platform capability."
      />

      <div className="rounded-2xl border bg-card p-12 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Settings className="size-7" />
        </div>

        <h2 className="mt-5 text-xl font-semibold">
          Coming next
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
          The application shell is ready. This module will
          be connected to its backend capabilities in the
          next implementation step.
        </p>
      </div>
    </div>
  )
}

/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={<Landing />}
        />

        <Route
          path="/login"
          element={<AuthPage mode="login" />}
        />

        <Route
          path="/register"
          element={
            <AuthPage mode="register" />
          }
        />

        <Route
          path="/app/*"
          element={<SessionGate />}
        />

        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App