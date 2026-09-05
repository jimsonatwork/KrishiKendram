import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'

import { api, type AdminUser } from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'

const ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'FARMER',
  'FARM_WORKER',
  'AGRONOMIST',
  'VETERINARIAN',
  'BUYER',
  'MERCHANT',
  'FPO',
  'PARTNER',
  'FIELD_OFFICER',
  'DISTRICT_ADMIN',
  'STATE_ADMIN',
  'GOVERNMENT',
  'NGO',
  'BANK',
  'LOGISTICS',
  'AI_AGENT',
]

const STATUSES = [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
  'PENDING_DELETE',
  'DELETED',
]

const formatRole = (role: string) =>
  role
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const formatDate = (value: string | null) => {
  if (!value) return 'Never'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

const statusClass = (status: string) => {
  switch (status) {
    case 'ACTIVE':
      return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
    case 'PENDING':
      return 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400'
    case 'SUSPENDED':
      return 'border-orange-500/20 bg-orange-500/10 text-orange-600 dark:text-orange-400'
    case 'BLOCKED':
      return 'border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400'
    case 'PENDING_DELETE':
      return 'border-violet-500/20 bg-violet-500/10 text-violet-600 dark:text-violet-400'
    case 'DELETED':
      return 'border-zinc-500/20 bg-zinc-500/10 text-zinc-500'
    default:
      return 'border-border bg-muted text-muted-foreground'
  }
}

type EditState = {
  user: AdminUser
  role: string
  status: string
} | null

export function UsersPage() {
  const { user: currentUser, accessToken } = useAuthStore()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const [editState, setEditState] = useState<EditState>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [notice, setNotice] = useState('')

  const loadUsers = async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError('')

    try {
      const result = await api.users(accessToken)
      setUsers(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load users',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [accessToken])

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        (user.email ?? '').toLowerCase().includes(query) ||
        (user.mobile ?? '').toLowerCase().includes(query)

      const matchesRole =
        roleFilter === 'ALL' || user.role === roleFilter

      const matchesStatus =
        statusFilter === 'ALL' || user.status === statusFilter

      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!accessToken) return

    setIsCreating(true)
    setError('')
    setNotice('')

    try {
      await api.createUser(
        {
          name: createName.trim(),
          email: createEmail.trim(),
          password: createPassword,
        },
        accessToken,
      )

      setCreateName('')
      setCreateEmail('')
      setCreatePassword('')
      setShowCreate(false)
      setNotice(
        'User created successfully. The new user is currently PENDING.',
      )

      await loadUsers()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to create user',
      )
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (user: AdminUser) => {
    setEditState({
      user,
      role: user.role,
      status: user.status,
    })
    setError('')
    setNotice('')
  }

  const handleSave = async () => {
    if (!accessToken || !editState) return

    const roleChanged = editState.role !== editState.user.role
    const statusChanged =
      editState.status !== editState.user.status

    if (!roleChanged && !statusChanged) {
      setEditState(null)
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const updated = await api.updateUser(
        editState.user.id,
        {
          ...(roleChanged
            ? { role: editState.role }
            : {}),
          ...(statusChanged
            ? { status: editState.status }
            : {}),
        },
        accessToken,
      )

      setUsers((current) =>
        current.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      )

      setEditState(null)
      setNotice('User updated successfully.')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update user',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const isEditingCurrentUser =
    editState?.user.id === currentUser?.id

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="size-4" />
            <span>Platform Administration</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            Users
          </h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage platform users, roles, and account status.
          </p>
        </div>

        <Button onClick={() => setShowCreate(true)}>
          <Plus />
          Create user
        </Button>
      </div>

      {/* Notice */}
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{notice}</span>
          <button
            type="button"
            className="ml-auto"
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button
            type="button"
            className="ml-auto"
            onClick={() => setError('')}
            aria-label="Dismiss error"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email or mobile..."
              className="h-10 w-full rounded-lg border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <FilterSelect
            value={roleFilter}
            onChange={setRoleFilter}
            options={['ALL', ...ROLES]}
            allLabel="All roles"
          />

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={['ALL', ...STATUSES]}
            allLabel="All statuses"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium text-foreground">
            {filteredUsers.length}
          </span>{' '}
          of{' '}
          <span className="font-medium text-foreground">
            {users.length}
          </span>{' '}
          users
        </p>

        {(search ||
          roleFilter !== 'ALL' ||
          statusFilter !== 'ALL') && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setRoleFilter('ALL')
              setStatusFilter('ALL')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {isLoading ? (
          <LoadingState />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            hasFilters={
              Boolean(search) ||
              roleFilter !== 'ALL' ||
              statusFilter !== 'ALL'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Last login
                  </th>
                  <th className="px-5 py-3 text-left font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-5 py-3 text-right font-medium text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <UserRound className="size-4" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-medium">
                              {user.name}
                            </p>

                            {user.id === currentUser?.id && (
                              <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                You
                              </span>
                            )}
                          </div>

                          <p className="truncate text-xs text-muted-foreground">
                            {user.email ??
                              user.mobile ??
                              'No contact information'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="inline-flex rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-medium">
                        {formatRole(user.role)}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(user.status)}`}
                      >
                        {formatRole(user.status)}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(user.lastLoginAt)}
                    </td>

                    <td className="px-5 py-4 text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </td>

                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(user)}
                      >
                        <Pencil />
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create dialog */}
      {showCreate && (
        <Modal
          title="Create user"
          description="Create a platform account. New accounts start as PENDING."
          onClose={() => {
            if (!isCreating) setShowCreate(false)
          }}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <Field
              label="Name"
              value={createName}
              onChange={setCreateName}
              placeholder="User name"
              required
            />

            <Field
              label="Email"
              type="email"
              value={createEmail}
              onChange={setCreateEmail}
              placeholder="user@example.com"
              required
            />

            <Field
              label="Password"
              type="password"
              value={createPassword}
              onChange={setCreatePassword}
              placeholder="Minimum password length enforced by backend"
              required
            />

            <div className="rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Role: <strong>Farmer</strong>
              <br />
              Status: <strong>Pending</strong>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreate(false)}
                disabled={isCreating}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isCreating}>
                {isCreating && (
                  <Loader2 className="animate-spin" />
                )}
                Create user
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit dialog */}
      {editState && (
        <Modal
          title="Edit user"
          description={`Manage role and status for ${editState.user.name}.`}
          onClose={() => {
            if (!isSaving) setEditState(null)
          }}
        >
          <div className="space-y-4">
            {isEditingCurrentUser && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                You are editing your own account. The backend
                remains the final authority for any protected
                role or status change.
              </div>
            )}

            <SelectField
              label="Role"
              value={editState.role}
              onChange={(value) =>
                setEditState((current) =>
                  current
                    ? { ...current, role: value }
                    : current,
                )
              }
              options={ROLES}
            />

            <SelectField
              label="Status"
              value={editState.status}
              onChange={(value) =>
                setEditState((current) =>
                  current
                    ? { ...current, status: value }
                    : current,
                )
              }
              options={STATUSES}
            />

            {editState.user.role === 'SUPER_ADMIN' &&
              editState.user.status === 'ACTIVE' &&
              (editState.role !== 'SUPER_ADMIN' ||
                editState.status !== 'ACTIVE') && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                  If this is the last active Super Admin,
                  the backend will reject the change.
                </div>
              )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditState(null)}
                disabled={isSaving}
              >
                Cancel
              </Button>

              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2 className="animate-spin" />
                )}
                Save changes
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  options,
  allLabel,
}: {
  value: string
  onChange: (value: string) => void
  options: string[]
  allLabel: string
}) {
  return (
    <div className="relative min-w-[180px]">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full appearance-none rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === 'ALL'
              ? allLabel
              : formatRole(option)}
          </option>
        ))}
      </select>

      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>

      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-full appearance-none rounded-lg border bg-background px-3 pr-9 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {formatRole(option)}
            </option>
          ))}
        </select>

        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </label>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  required?: boolean
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>

      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-10 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
      />
    </label>
  )
}

function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close"
          >
            <X />
          </Button>
        </div>

        {children}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading users...
      </div>
    </div>
  )
}

function EmptyState({
  hasFilters,
}: {
  hasFilters: boolean
}) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex size-11 items-center justify-center rounded-full bg-muted">
        <UserRound className="size-5 text-muted-foreground" />
      </div>

      <h3 className="font-medium">
        {hasFilters ? 'No matching users' : 'No users found'}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? 'Try changing your search or filters.'
          : 'There are no users available in the platform yet.'}
      </p>
    </div>
  )
}
