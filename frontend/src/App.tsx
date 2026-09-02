import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
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
import { api } from './lib/api'

/* =========================================================
   LANDING
========================================================= */

function Landing() {
  return (
    <div className="min-h-screen bg-green-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-bold text-green-700"
          >
            KrishiKendram
          </Link>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-gray-600 hover:text-green-700"
            >
              Login
            </Link>

            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-medium mb-6">
            Smart Farm Management
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight">
            Your farm.
            <br />
            Your data.
            <br />
            Your intelligence.
          </h1>

          <p className="mt-6 text-lg text-gray-600 max-w-2xl">
            Manage farms, crops, assets and records from one simple
            platform built for modern agriculture.
          </p>

          <div className="mt-8 flex gap-4">
            <Link
              to="/register"
              className="px-6 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
            >
              Create Account
            </Link>

            <Link
              to="/login"
              className="px-6 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const result = await api.login({
        identifier: email,
        password,
      })

      localStorage.setItem(
        'accessToken',
        result.accessToken,
      )

      localStorage.setItem(
        'refreshToken',
        result.refreshToken,
      )

      navigate('/app', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Login failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-green-700"
          >
            KrishiKendram
          </Link>

          <p className="mt-2 text-gray-600">
            Sign in to your farm
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading
                ? 'Signing in...'
                : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-green-700 font-medium hover:underline"
            >
              Create one
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   REGISTER
========================================================= */

function Register() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      await api.register({
        name,
        email,
        password,
      })

      navigate('/login', { replace: true })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Registration failed',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-green-700"
          >
            KrishiKendram
          </Link>

          <p className="mt-2 text-gray-600">
            Create your account
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                required
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                minLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {loading
                ? 'Creating account...'
                : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-green-700 font-medium hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/* =========================================================
   PORTAL LAYOUT
========================================================= */

function PortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  const [checkingSession, setCheckingSession] =
    useState(true)

  const [authenticated, setAuthenticated] =
    useState(false)

  useEffect(() => {
    const token =
      localStorage.getItem('accessToken')

    if (!token) {
      setCheckingSession(false)
      navigate('/login', { replace: true })
      return
    }

    api.me(token)
      .then(() => {
        setAuthenticated(true)
      })
      .catch(() => {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')

        navigate('/login', {
          replace: true,
        })
      })
      .finally(() => {
        setCheckingSession(false)
      })
  }, [navigate])

  const handleLogout = async () => {
    const token =
      localStorage.getItem('accessToken')

    try {
      if (token) {
        await api.logout(token)
      }
    } catch {
      // Continue with local logout.
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')

      navigate('/login', {
        replace: true,
      })
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <div className="text-gray-600">
          Checking your session...
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return null
  }

  const path = location.pathname

  let content = <Dashboard />

  if (path === '/app/farms') {
    content = <FarmsPage />
  } else if (path === '/app/crops') {
    content = <CropsPage />
  } else if (path === '/app/activities') {
    content = (
      <ComingSoon title="Activities" />
    )
  } else if (path === '/app/history') {
    content = (
      <ComingSoon title="Farm History" />
    )
  } else if (path === '/app/intake') {
    content = (
      <ComingSoon title="AI Intake" />
    )
  }

  const navigation = [
    ['Dashboard', '/app'],
    ['My Farms', '/app/farms'],
    ['Crops', '/app/crops'],
    ['Activities', '/app/activities'],
    ['History', '/app/history'],
    ['AI Intake', '/app/intake'],
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-64 bg-white border-r flex-col">
        <div className="p-6 border-b">
          <div className="text-xl font-bold text-green-700">
            KrishiKendram
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Smart Farm Management
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map(
            ([label, href]) => (
              <NavLink
                key={href}
                to={href}
                end={href === '/app'}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-green-100 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`
                }
              >
                {label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 text-left"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 min-w-0">
        <header className="md:hidden bg-white border-b px-4 py-4 flex items-center justify-between">
          <div>
            <div className="font-bold text-green-700">
              KrishiKendram
            </div>

            <div className="text-xs text-gray-500">
              Smart Farm Management
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-red-600 font-medium"
          >
            Logout
          </button>
        </header>

        <main className="p-4 md:p-8">
          {content}
        </main>
      </div>
    </div>
  )
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard
        </h1>

        <p className="mt-1 text-gray-600">
          Welcome back to KrishiKendram.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardCard
          title="My Farms"
          value="0"
          href="/app/farms"
        />

        <DashboardCard
          title="Crops"
          value="0"
          href="/app/crops"
        />

        <DashboardCard
          title="Activities"
          value="0"
          href="/app/activities"
        />

        <DashboardCard
          title="Records"
          value="0"
          href="/app/history"
        />
      </div>

      <div className="mt-8 bg-white border rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Getting Started
        </h2>

        <p className="mt-2 text-gray-600">
          Start by creating your first farm and
          adding your crops, livestock, assets and
          records.
        </p>

        <Link
          to="/app/farms"
          className="inline-block mt-4 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700"
        >
          Create Your First Farm
        </Link>
      </div>
    </div>
  )
}

function DashboardCard({
  title,
  value,
  href,
}: {
  title: string
  value: string
  href: string
}) {
  return (
    <Link
      to={href}
      className="bg-white border rounded-xl p-5 hover:shadow-sm transition"
    >
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-3xl font-bold text-gray-900">
        {value}
      </div>
    </Link>
  )
}

/* =========================================================
   FARMS - PART 1
========================================================= */

function FarmsPage() {
  const token =
    localStorage.getItem('accessToken')

  const [farms, setFarms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showForm, setShowForm] =
    useState(false)

  const [editingFarm, setEditingFarm] =
    useState<any | null>(null)

  const [name, setName] = useState('')
  const [type, setType] =
    useState('AGRICULTURE_DAIRY')

  const [location, setLocation] =
    useState('')

  const [area, setArea] =
    useState('')

  const [unit, setUnit] =
    useState('acre')

  const [assetFarmId, setAssetFarmId] =
    useState('')

  const [assetName, setAssetName] =
    useState('')

  const [assetType, setAssetType] =
    useState('CATTLE')

  const [assetQuantity, setAssetQuantity] =
    useState('1')

  const [assetUnit, setAssetUnit] =
    useState('count')

  const [recordFarmId, setRecordFarmId] =
    useState('')

  const [recordTitle, setRecordTitle] =
    useState('')

  const [recordDescription, setRecordDescription] =
    useState('')

  const loadFarms = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const result =
        await api.farms(token)

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
    loadFarms()
  }, [])

  const resetFarmForm = () => {
    setName('')
    setType('AGRICULTURE_DAIRY')
    setLocation('')
    setArea('')
    setUnit('acre')
    setEditingFarm(null)
    setShowForm(false)
  }

  const handleFarmSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token) return

    setError('')

    try {
      const data = {
        name,
        type,
        location,
        area: area
          ? Number(area)
          : undefined,
        unit,
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

      resetFarmForm()
      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save farm',
      )
    }
  }

  const handleEdit = (farm: any) => {
    setEditingFarm(farm)

    setName(farm.name || '')
    setType(
      farm.type ||
        'AGRICULTURE_DAIRY',
    )

    setLocation(
      farm.location || '',
    )

    setArea(
      farm.area !== null &&
      farm.area !== undefined
        ? String(farm.area)
        : '',
    )

    setUnit(
      farm.unit || 'acre',
    )

    setShowForm(true)
  }

  const handleDelete = async (
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

  const handleAddAsset = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token || !assetFarmId) {
      return
    }

    try {
      await api.addFarmAsset(
        assetFarmId,
        {
          name: assetName,
          type: assetType,
          quantity: Number(
            assetQuantity,
          ),
          unit: assetUnit,
        },
        token,
      )

      setAssetName('')
      setAssetQuantity('1')

      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add asset',
      )
    }
  }

  const handleAddRecord = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token || !recordFarmId) {
      return
    }

    try {
      await api.addFarmRecord(
        recordFarmId,
        {
          category: 'GENERAL',
          title: recordTitle,
          description: recordDescription,
          inputMethod: 'MANUAL',
        },
        token,
      )

      setRecordTitle('')
      setRecordDescription('')

      await loadFarms()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to add record',
      )
    }
  }

  if (loading) {
    return (
      <div className="text-gray-600">
        Loading farms...
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            My Farms
          </h1>

          <p className="mt-1 text-gray-600">
            Manage your farms and farm information.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              resetFarmForm()
            } else {
              setShowForm(true)
            }
          }}
          className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
        >
          {showForm
            ? 'Cancel'
            : 'Add Farm'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleFarmSubmit}
          className="bg-white border rounded-xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-5">
            {editingFarm
              ? 'Edit Farm'
              : 'Create Farm'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="Farm name"
              className="px-3 py-2 border rounded-lg"
            />

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="AGRICULTURE_DAIRY">
                Agriculture + Dairy
              </option>

              <option value="AGRICULTURE">
                Agriculture
              </option>

              <option value="LIVESTOCK">
                Livestock
              </option>

              <option value="DAIRY">
                Dairy
              </option>

              <option value="POULTRY">
                Poultry
              </option>

              <option value="MIXED">
                Mixed
              </option>
            </select>

            <input
              value={location}
              onChange={(event) =>
                setLocation(
                  event.target.value,
                )
              }
              placeholder="Location"
              className="px-3 py-2 border rounded-lg"
            />

            <input
              value={area}
              onChange={(event) =>
                setArea(event.target.value)
              }
              type="number"
              step="0.01"
              placeholder="Area"
              className="px-3 py-2 border rounded-lg"
            />

            <input
              value={unit}
              onChange={(event) =>
                setUnit(event.target.value)
              }
              placeholder="Unit (acre, hectare...)"
              className="px-3 py-2 border rounded-lg"
            />
          </div>

          <button
            type="submit"
            className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
          >
            {editingFarm
              ? 'Update Farm'
              : 'Create Farm'}
          </button>
        </form>
      )}
	        <div className="space-y-6">
        {farms.length === 0 ? (
          <div className="bg-white border rounded-xl p-8 text-center">
            <div className="text-4xl mb-4">🌱</div>
            <h2 className="text-lg font-semibold text-gray-900">
              No farms yet
            </h2>
            <p className="mt-2 text-gray-600">
              Create your first farm to start managing
              your agricultural data.
            </p>

            <button
              onClick={() => setShowForm(true)}
              className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
            >
              Add Your First Farm
            </button>
          </div>
        ) : (
          farms.map((farm) => (
            <div
              key={farm.id}
              className="bg-white border rounded-xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {farm.name}
                    </h2>

                    <div className="mt-2 space-y-1 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">
                          Type:
                        </span>{' '}
                        {farm.type || '—'}
                      </div>

                      <div>
                        <span className="font-medium">
                          Location:
                        </span>{' '}
                        {farm.location || '—'}
                      </div>

                      <div>
                        <span className="font-medium">
                          Area:
                        </span>{' '}
                        {farm.area !== null &&
                        farm.area !== undefined
                          ? `${farm.area} ${
                              farm.unit || ''
                            }`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleEdit(farm)
                      }
                      className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(farm.id)
                      }
                      className="px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="border-t bg-gray-50 p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Assets
                    </h3>

                    {farm.assets?.length ? (
                      <div className="mt-3 space-y-2">
                        {farm.assets.map(
                          (asset: any) => (
                            <div
                              key={asset.id}
                              className="bg-white border rounded-lg p-3"
                            >
                              <div className="font-medium text-gray-900">
                                {asset.name}
                              </div>

                              <div className="text-sm text-gray-600 mt-1">
                                {asset.type || '—'} ·{' '}
                                {asset.quantity ?? 0}{' '}
                                {asset.unit || ''}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No assets added yet.
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Records
                    </h3>

                    {farm.records?.length ? (
                      <div className="mt-3 space-y-2">
                        {farm.records.map(
                          (record: any) => (
                            <div
                              key={record.id}
                              className="bg-white border rounded-lg p-3"
                            >
                              <div className="font-medium text-gray-900">
                                {record.title ||
                                  'Untitled record'}
                              </div>

                              <div className="text-sm text-gray-600 mt-1">
                                {record.description ||
                                  'No description'}
                              </div>

                              <div className="text-xs text-gray-400 mt-2">
                                {record.category ||
                                  'GENERAL'}
                              </div>
                            </div>
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">
                        No records added yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
	        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleAddAsset}
          className="bg-white border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Add Farm Asset
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Add livestock, equipment or other farm assets.
          </p>

          <div className="mt-5 space-y-4">
            <select
              value={assetFarmId}
              onChange={(event) =>
                setAssetFarmId(event.target.value)
              }
              required
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">
                Select farm
              </option>

              {farms.map((farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ))}
            </select>

            <input
              value={assetName}
              onChange={(event) =>
                setAssetName(event.target.value)
              }
              required
              placeholder="Asset name"
              className="w-full px-3 py-2 border rounded-lg"
            />

            <select
              value={assetType}
              onChange={(event) =>
                setAssetType(event.target.value)
              }
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="CATTLE">
                Cattle
              </option>
              <option value="BUFFALO">
                Buffalo
              </option>
              <option value="GOAT">
                Goat
              </option>
              <option value="SHEEP">
                Sheep
              </option>
              <option value="POULTRY">
                Poultry
              </option>
              <option value="EQUIPMENT">
                Equipment
              </option>
              <option value="OTHER">
                Other
              </option>
            </select>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={assetQuantity}
                onChange={(event) =>
                  setAssetQuantity(
                    event.target.value,
                  )
                }
                required
                placeholder="Quantity"
                className="px-3 py-2 border rounded-lg"
              />

              <input
                value={assetUnit}
                onChange={(event) =>
                  setAssetUnit(
                    event.target.value,
                  )
                }
                placeholder="Unit"
                className="px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
          >
            Add Asset
          </button>
        </form>

        <form
          onSubmit={handleAddRecord}
          className="bg-white border rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            Add Farm Record
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Record activities, observations or other farm information.
          </p>

          <div className="mt-5 space-y-4">
            <select
              value={recordFarmId}
              onChange={(event) =>
                setRecordFarmId(
                  event.target.value,
                )
              }
              required
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">
                Select farm
              </option>

              {farms.map((farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ))}
            </select>

            <input
              value={recordTitle}
              onChange={(event) =>
                setRecordTitle(
                  event.target.value,
                )
              }
              required
              placeholder="Record title"
              className="w-full px-3 py-2 border rounded-lg"
            />

            <textarea
              value={recordDescription}
              onChange={(event) =>
                setRecordDescription(
                  event.target.value,
                )
              }
              rows={5}
              placeholder="Description"
              className="w-full px-3 py-2 border rounded-lg resize-none"
            />
          </div>

          <button
            type="submit"
            className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
          >
            Add Record
          </button>
        </form>
      </div>
    </div>
  )
}

function CropsPage() {
  const token =
    localStorage.getItem('accessToken')

  const [crops, setCrops] =
    useState<any[]>([])

  const [farms, setFarms] =
    useState<any[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState('')

  const [showForm, setShowForm] =
    useState(false)

  const [editingCrop, setEditingCrop] =
    useState<any | null>(null)

  const [farmId, setFarmId] =
    useState('')

  const [name, setName] =
    useState('')

  const [variety, setVariety] =
    useState('')

  const [season, setSeason] =
    useState('')

  const [status, setStatus] =
    useState('PLANNED')

  const [sowingDate, setSowingDate] =
    useState('')

  const [harvestDate, setHarvestDate] =
    useState('')

  const [area, setArea] =
    useState('')

  const [unit, setUnit] =
    useState('acre')

  const [notes, setNotes] =
    useState('')

  const loadData = async () => {
    if (!token) return

    setLoading(true)
    setError('')

    try {
      const [
        cropsResult,
        farmsResult,
      ] = await Promise.all([
        api.crops(token),
        api.farms(token),
      ])

      setCrops(cropsResult)
      setFarms(farmsResult)
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
    loadData()
  }, [])

  const resetCropForm = () => {
    setFarmId('')
    setName('')
    setVariety('')
    setSeason('')
    setStatus('PLANNED')
    setSowingDate('')
    setHarvestDate('')
    setArea('')
    setUnit('acre')
    setNotes('')
    setEditingCrop(null)
    setShowForm(false)
  }

  const handleCropSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    if (!token) return

    setError('')

    try {
      const data = {
        farmId,
        name,
        variety: variety || undefined,
        season: season || undefined,
        status,
        sowingDate:
          sowingDate || undefined,
        harvestDate:
          harvestDate || undefined,
        area: area
          ? Number(area)
          : undefined,
        unit,
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

      resetCropForm()
      await loadData()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to save crop',
      )
    }
  }

  const handleEditCrop = (
    crop: any,
  ) => {
    setEditingCrop(crop)

    setFarmId(
      crop.farmId ||
        crop.farm?.id ||
        '',
    )

    setName(crop.name || '')
    setVariety(crop.variety || '')
    setSeason(crop.season || '')
    setStatus(
      crop.status || 'PLANNED',
    )

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

    setUnit(
      crop.unit || 'acre',
    )

    setNotes(crop.notes || '')
    setShowForm(true)
  }

  const handleDeleteCrop = async (
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
    return (
      <div className="text-gray-600">
        Loading crops...
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Crops
          </h1>

          <p className="mt-1 text-gray-600">
            Manage crops across your farms.
          </p>
        </div>

        <button
          onClick={() => {
            if (showForm) {
              resetCropForm()
            } else {
              setShowForm(true)
            }
          }}
          className="px-4 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
        >
          {showForm
            ? 'Cancel'
            : 'Add Crop'}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleCropSubmit}
          className="bg-white border rounded-xl p-6 mb-8"
        >
          <h2 className="text-lg font-semibold mb-5">
            {editingCrop
              ? 'Edit Crop'
              : 'Add Crop'}
          </h2>
	          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select
              value={farmId}
              onChange={(event) =>
                setFarmId(event.target.value)
              }
              required
              className="px-3 py-2 border rounded-lg"
            >
              <option value="">
                Select farm
              </option>

              {farms.map((farm) => (
                <option
                  key={farm.id}
                  value={farm.id}
                >
                  {farm.name}
                </option>
              ))}
            </select>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="Crop name"
              className="px-3 py-2 border rounded-lg"
            />

            <input
              value={variety}
              onChange={(event) =>
                setVariety(event.target.value)
              }
              placeholder="Variety"
              className="px-3 py-2 border rounded-lg"
            />

            <input
              value={season}
              onChange={(event) =>
                setSeason(event.target.value)
              }
              placeholder="Season"
              className="px-3 py-2 border rounded-lg"
            />

            <select
              value={status}
              onChange={(event) =>
                setStatus(event.target.value)
              }
              className="px-3 py-2 border rounded-lg"
            >
              <option value="PLANNED">
                Planned
              </option>
              <option value="ACTIVE">
                Active
              </option>
              <option value="HARVESTED">
                Harvested
              </option>
              <option value="COMPLETED">
                Completed
              </option>
            </select>

            <input
              type="number"
              step="0.01"
              value={area}
              onChange={(event) =>
                setArea(event.target.value)
              }
              placeholder="Area"
              className="px-3 py-2 border rounded-lg"
            />

            <input
              value={unit}
              onChange={(event) =>
                setUnit(event.target.value)
              }
              placeholder="Unit (acre, hectare...)"
              className="px-3 py-2 border rounded-lg"
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sowing Date
              </label>
              <input
                type="date"
                value={sowingDate}
                onChange={(event) =>
                  setSowingDate(
                    event.target.value,
                  )
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harvest Date
              </label>
              <input
                type="date"
                value={harvestDate}
                onChange={(event) =>
                  setHarvestDate(
                    event.target.value,
                  )
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <textarea
            value={notes}
            onChange={(event) =>
              setNotes(event.target.value)
            }
            rows={4}
            placeholder="Notes"
            className="w-full mt-4 px-3 py-2 border rounded-lg resize-none"
          />

          <button
            type="submit"
            className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
          >
            {editingCrop
              ? 'Update Crop'
              : 'Create Crop'}
          </button>
        </form>
      )}

      {crops.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center">
          <div className="text-4xl mb-4">
            🌾
          </div>

          <h2 className="text-lg font-semibold text-gray-900">
            No crops yet
          </h2>

          <p className="mt-2 text-gray-600">
            Add your first crop to start tracking
            cultivation.
          </p>

          <button
            onClick={() =>
              setShowForm(true)
            }
            className="mt-5 px-5 py-2 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700"
          >
            Add Your First Crop
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {crops.map((crop) => (
            <div
              key={crop.id}
              className="bg-white border rounded-xl p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {crop.name}
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    {crop.farm?.name ||
                      'Unknown farm'}
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  {crop.status || 'PLANNED'}
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">
                    Variety
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    {crop.variety || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">
                    Season
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    {crop.season || '—'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">
                    Area
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    {crop.area !== null &&
                    crop.area !== undefined
                      ? `${crop.area} ${
                          crop.unit || ''
                        }`
                      : '—'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">
                    Sowing
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    {crop.sowingDate
                      ? String(
                          crop.sowingDate,
                        ).slice(0, 10)
                      : '—'}
                  </div>
                </div>

                <div>
                  <div className="text-gray-500">
                    Harvest
                  </div>
                  <div className="font-medium text-gray-900 mt-1">
                    {crop.harvestDate
                      ? String(
                          crop.harvestDate,
                        ).slice(0, 10)
                      : '—'}
                  </div>
                </div>
              </div>

              {crop.notes && (
                <div className="mt-5 bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500">
                    Notes
                  </div>

                  <div className="mt-1 text-sm text-gray-700">
                    {crop.notes}
                  </div>
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  onClick={() =>
                    handleEditCrop(crop)
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  onClick={() =>
                    handleDeleteCrop(crop.id)
                  }
                  className="px-3 py-2 rounded-lg border border-red-200 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Archive
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ComingSoon({
  title,
}: {
  title: string
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {title}
        </h1>

        <p className="mt-1 text-gray-600">
          This section is being prepared.
        </p>
      </div>

      <div className="bg-white border rounded-xl p-10 text-center">
        <div className="text-5xl mb-4">
          🚜
        </div>

        <h2 className="text-xl font-semibold text-gray-900">
          Coming soon
        </h2>

        <p className="mt-2 text-gray-600 max-w-md mx-auto">
          We are building this part of
          KrishiKendram next.
        </p>
      </div>
    </div>
  )
}

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
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />

        <Route
          path="/app/*"
          element={<PortalLayout />}
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