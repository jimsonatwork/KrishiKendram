export type AppRouteAudience = 'PUBLIC' | 'AUTHENTICATED' | 'SUPER_ADMIN'

export type AppRouteDefinition = {
  key: string
  path: string
  label: string
  audience: AppRouteAudience
}

export const APP_ROUTES: readonly AppRouteDefinition[] = [
  { key: 'landing', path: '/', label: 'Home', audience: 'PUBLIC' },
  { key: 'login', path: '/login', label: 'Sign in', audience: 'PUBLIC' },
  { key: 'register', path: '/register', label: 'Get started', audience: 'PUBLIC' },
  { key: 'dashboard', path: '/app', label: 'Dashboard', audience: 'AUTHENTICATED' },
  { key: 'farms', path: '/app/farms', label: 'My Farms', audience: 'AUTHENTICATED' },
  { key: 'crops', path: '/app/crops', label: 'Crops', audience: 'AUTHENTICATED' },
  { key: 'livestock', path: '/app/livestock', label: 'Livestock', audience: 'AUTHENTICATED' },
  { key: 'marketplace', path: '/app/marketplace', label: 'Marketplace', audience: 'AUTHENTICATED' },
  { key: 'activities', path: '/app/activities', label: 'Activities', audience: 'AUTHENTICATED' },
  { key: 'history', path: '/app/history', label: 'History', audience: 'AUTHENTICATED' },
  { key: 'intake', path: '/app/intake', label: 'AI Intake', audience: 'AUTHENTICATED' },
  { key: 'users', path: '/app/users', label: 'Users', audience: 'SUPER_ADMIN' },
  { key: 'roles', path: '/app/roles', label: 'Roles', audience: 'SUPER_ADMIN' },
  { key: 'audit', path: '/app/audit', label: 'Audit', audience: 'SUPER_ADMIN' },
  { key: 'permissions', path: '/app/permissions', label: 'Permissions', audience: 'SUPER_ADMIN' },
  { key: 'resources', path: '/app/resources', label: 'Resources', audience: 'SUPER_ADMIN' },
  { key: 'modules', path: '/app/modules', label: 'Modules', audience: 'SUPER_ADMIN' },
  { key: 'capabilities', path: '/app/capabilities', label: 'Capabilities', audience: 'SUPER_ADMIN' },
  { key: 'system', path: '/app/system', label: 'System', audience: 'SUPER_ADMIN' },
]

export const APP_PATH = Object.fromEntries(APP_ROUTES.map((route) => [route.key, route.path])) as Record<string, string>

export function routeForPath(path: string): AppRouteDefinition | undefined {
  return APP_ROUTES.find((route) => route.path === path)
}

export function canRenderRoute(route: AppRouteDefinition, role: string): boolean {
  if (route.audience === 'PUBLIC') return true
  if (route.audience === 'SUPER_ADMIN') return role === 'SUPER_ADMIN'
  return Boolean(role)
}
