// ============================================================
// USERS PAGE
// File: src/pages/admin/UsersPage.tsx
//
// MAIN / COORDINATOR
//
// Responsibilities:
// - Authentication
// - User API calls
// - Page state
// - Search and filters
// - Selection and bulk operations
// - Create/edit/activity orchestration
// - Business and authorization flow
//
// UI is intentionally delegated to:
// - users/UsersTable.tsx
// - users/UserCreateDialog.tsx
// - users/UserEditDialog.tsx
// - users/UserActivityDialog.tsx
//
// FUTURE UPDATE GUIDE:
// Keep API calls and business logic here.
// Keep child components focused on presentation.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { FormEvent } from 'react'

import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'

import {
  api,
  type AdminUser,
  type AuditEvent,
  type UpdateAdminUserData,
} from '@/lib/api'

import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'

import { UsersTable } from './UsersTable'
import { UserCreateDialog } from './UserCreateDialog'
import { UserEditDialog } from './UserEditDialog'
import { UserActivityDialog } from './UserActivityDialog'

// ============================================================
// PLATFORM ROLE DEFINITIONS
// ============================================================

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

// ============================================================
// ACCOUNT STATUS DEFINITIONS
// ============================================================

const STATUSES = [
  'PENDING',
  'ACTIVE',
  'SUSPENDED',
  'BLOCKED',
  'PENDING_DELETE',
  'DELETED',
]

// ============================================================
// ACTIVITY CONFIGURATION
// ============================================================

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

// ============================================================
// DISPLAY FORMATTERS
// ============================================================

const formatRole = (role: string) =>
  role
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')

const formatDate = (value: string | null) => {
  if (!value) return 'Never'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value))
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Never'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

// ============================================================
// USER ACTIVITY HELPER
// ============================================================

const isRecentlyActive = (
  lastSeenAt: string | null,
) => {
  if (!lastSeenAt) return false

  return (
    Date.now() -
      new Date(lastSeenAt).getTime() <=
    ACTIVE_WINDOW_MS
  )
}

// ============================================================
// ACCOUNT STATUS STYLING
// ============================================================

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

// ============================================================
// EDIT STATE
// ============================================================

export type EditState = {
  user: AdminUser
  name: string
  email: string
  mobile: string
  password: string
  role: string
  status: string
  preferredLanguage: string
  preferredInputMethod: string
  profileCompletion: string
  isVerified: boolean
} | null

// ============================================================
// USERS PAGE
// ============================================================

export function UsersPage() {
  // ==========================================================
  // AUTHENTICATION
  // ==========================================================

  const {
    user: currentUser,
    accessToken,
  } = useAuthStore()

  // ==========================================================
  // USER LIST
  // ==========================================================

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================================
  // SEARCH & FILTERS
  // ==========================================================

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ==========================================================
  // EDIT STATE
  // ==========================================================

  const [editState, setEditState] =
    useState<EditState>(null)

  const [isSaving, setIsSaving] = useState(false)
  const [editPasswordError, setEditPasswordError] =
    useState('')

  // ==========================================================
  // MULTI-USER SELECTION
  // ==========================================================

  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>([])

  const [editSelectionIndex, setEditSelectionIndex] =
    useState(0)

  const [isMultiUserEdit, setIsMultiUserEdit] =
    useState(false)

  // ==========================================================
  // BULK DELETE
  // ==========================================================

  const [isBulkDeleting, setIsBulkDeleting] =
    useState(false)

  // ==========================================================
  // CREATE USER
  // ==========================================================

  const [showCreate, setShowCreate] =
    useState(false)

  const [createName, setCreateName] =
    useState('')

  const [createEmail, setCreateEmail] =
    useState('')

  const [createPassword, setCreatePassword] =
    useState('')

  const [isCreating, setIsCreating] =
    useState(false)

  // ==========================================================
  // PAGE FEEDBACK
  // ==========================================================

  const [notice, setNotice] = useState('')

  // ==========================================================
  // ACTIVITY
  // ==========================================================

  const [activityUser, setActivityUser] =
    useState<AdminUser | null>(null)

  const [activity, setActivity] =
    useState<AuditEvent[]>([])

  const [isActivityLoading, setIsActivityLoading] =
    useState(false)

  // ==========================================================
  // USER SELECTION
  // ==========================================================

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    )
  }

  const toggleSelectAll = () => {
    const filteredIds = filteredUsers.map(
      (user) => user.id,
    )

    const allFilteredSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) =>
        selectedUserIds.includes(id),
      )

    if (allFilteredSelected) {
      setSelectedUserIds((current) =>
        current.filter(
          (id) => !filteredIds.includes(id),
        ),
      )

      return
    }

    setSelectedUserIds((current) => [
      ...new Set([
        ...current,
        ...filteredIds,
      ]),
    ])
  }
   // ==========================================================
  // LOAD USERS
  // ==========================================================

  const loadUsers = async () => {
    if (!accessToken) {
      return
    }

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

  // ==========================================================
  // INITIAL / AUTHENTICATION-DEPENDENT LOAD
  // ==========================================================

  useEffect(() => {
    void loadUsers()
  }, [accessToken])

  // ==========================================================
  // SEARCH & FILTERING
  // ==========================================================

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name
          .toLowerCase()
          .includes(query) ||
        (user.email ?? '')
          .toLowerCase()
          .includes(query) ||
        (user.mobile ?? '')
          .toLowerCase()
          .includes(query)

      const matchesRole =
        roleFilter === 'ALL' ||
        user.role === roleFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        user.status === statusFilter

      return (
        matchesSearch &&
        matchesRole &&
        matchesStatus
      )
    })
  }, [
    users,
    search,
    roleFilter,
    statusFilter,
  ])

  // ==========================================================
  // RECENTLY ACTIVE COUNT
  // ==========================================================

  const activeUserCount = useMemo(
    () =>
      users.filter((user) =>
        isRecentlyActive(user.lastSeenAt),
      ).length,
    [users],
  )

  // ==========================================================
  // BULK DELETE
  // ==========================================================

  const handleBulkDelete = async () => {
    if (
      !accessToken ||
      selectedUserIds.length === 0
    ) {
      return
    }

    const confirmed = window.confirm(
      `Mark ${selectedUserIds.length} user(s) for deletion?`,
    )

    if (!confirmed) {
      return
    }

    setIsBulkDeleting(true)
    setError('')

    try {
      await api.bulkDeleteUsers(
        selectedUserIds,
        accessToken,
      )

      setSelectedUserIds([])

      const refreshedUsers =
        await api.users(accessToken)

      setUsers(refreshedUsers)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to delete selected users',
      )
    } finally {
      setIsBulkDeleting(false)
    }
  }

  // ==========================================================
  // CREATE USER
  // ==========================================================

  const handleCreate = async (
    event: FormEvent,
  ) => {
    event.preventDefault()

    if (!accessToken) {
      return
    }

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

  // ==========================================================
  // BUILD EDIT STATE
  //
  // Centralized so every edit entry point initializes the same
  // fields consistently.
  // ==========================================================

  const createEditState = (
    user: AdminUser,
  ): NonNullable<EditState> => ({
    user,
    name: user.name ?? '',
    email: user.email ?? '',
    mobile: user.mobile ?? '',
    password: '',
    role: user.role,
    status: user.status,
    preferredLanguage:
      user.preferredLanguage ?? '',
    preferredInputMethod:
      user.preferredInputMethod ?? 'MIXED',
    profileCompletion: String(
      user.profileCompletion ?? 0,
    ),
    isVerified: user.isVerified ?? false,
  })

  // ==========================================================
  // OPEN EDIT
  // ==========================================================

  const openEdit = (user: AdminUser) => {
    setIsMultiUserEdit(false)
    setEditSelectionIndex(0)
    setEditPasswordError('')
    setEditState(createEditState(user))
  }

  const openRowEdit = (user: AdminUser) => {
    const selectedIndex =
      selectedUserIds.indexOf(user.id)

    if (
      selectedUserIds.length > 1 &&
      selectedIndex >= 0
    ) {
      setIsMultiUserEdit(true)
      setEditSelectionIndex(selectedIndex)
      setEditPasswordError('')
      setEditState(createEditState(user))
      return
    }

    openEdit(user)
  }

  // ==========================================================
  // OPEN SELECTED USERS
  // ==========================================================

  const openSelectedUsersEdit = () => {
    const validSelectedIds =
      selectedUserIds.filter((id) =>
        users.some((user) => user.id === id),
      )

    if (validSelectedIds.length === 0) {
      setSelectedUserIds([])
      return
    }

    if (
      validSelectedIds.length !==
      selectedUserIds.length
    ) {
      setSelectedUserIds(validSelectedIds)
    }

    const firstUser = users.find(
      (user) =>
        user.id === validSelectedIds[0],
    )

    if (!firstUser) {
      return
    }

    setIsMultiUserEdit(
      validSelectedIds.length > 1,
    )

    setEditSelectionIndex(0)
    setEditPasswordError('')
    setEditState(createEditState(firstUser))
  }

  // ==========================================================
  // SELECTED USER NAVIGATION
  // ==========================================================

  const openSelectedUserAtIndex = (
    index: number,
  ) => {
    if (
      index < 0 ||
      index >= selectedUserIds.length
    ) {
      return
    }

    const userId =
      selectedUserIds[index]

    const user = users.find(
      (item) => item.id === userId,
    )

    if (!user) {
      return
    }

    setEditSelectionIndex(index)
    setEditPasswordError('')
    setEditState(createEditState(user))
  }

  const handleNextSelectedUser = () => {
    const nextIndex =
      editSelectionIndex + 1

    if (
      nextIndex >=
      selectedUserIds.length
    ) {
      return
    }

    openSelectedUserAtIndex(nextIndex)
  }

  const handlePreviousSelectedUser = () => {
    const previousIndex =
      editSelectionIndex - 1

    if (previousIndex < 0) {
      return
    }

    openSelectedUserAtIndex(
      previousIndex,
    )
  }
   // ==========================================================
  // CLOSE EDIT
  // ==========================================================

  const closeEdit = () => {
    if (isSaving) {
      return
    }

    setEditState(null)
    setEditPasswordError('')
    setIsMultiUserEdit(false)
    setEditSelectionIndex(0)
  }

  // ==========================================================
  // SAVE USER
  //
  // Backend remains authoritative.
  //
  // Password validation is intentionally handled before the API
  // request so invalid passwords do not prevent other valid
  // fields from being saved.
  // ==========================================================

  const handleSave = async () => {
    if (!editState || !accessToken) {
      return
    }

    const nameChanged =
      editState.name.trim() !==
      editState.user.name

    const emailChanged =
      editState.email.trim() !==
      (editState.user.email ?? '')

    const mobileChanged =
      editState.mobile.trim() !==
      (editState.user.mobile ?? '')

    const passwordChanged =
      editState.password.trim().length > 0

    const roleChanged =
      editState.role !== editState.user.role

    const statusChanged =
      editState.status !==
      editState.user.status

    const preferredLanguageChanged =
      editState.preferredLanguage.trim() !==
      (editState.user.preferredLanguage ?? '')

    const preferredInputMethodChanged =
      editState.preferredInputMethod !==
      editState.user.preferredInputMethod

    const profileCompletionValue =
      Number(editState.profileCompletion)

    const profileCompletionChanged =
      Number.isInteger(
        profileCompletionValue,
      ) &&
      profileCompletionValue !==
        editState.user.profileCompletion

    const verificationChanged =
      editState.isVerified !==
      editState.user.isVerified

    // ----------------------------------------------------------
    // Password validation
    //
    // Do not send an invalid password.
    // Other valid changes remain eligible for saving.
    // ----------------------------------------------------------

    const newPassword =
      editState.password.trim()

    const passwordIsValid =
      !passwordChanged ||
      newPassword.length >= 8

    if (!passwordIsValid) {
      setEditPasswordError(
        'Password must be at least 8 characters.',
      )
    } else {
      setEditPasswordError('')
    }

    const hasNonPasswordChanges =
      nameChanged ||
      emailChanged ||
      mobileChanged ||
      roleChanged ||
      statusChanged ||
      preferredLanguageChanged ||
      preferredInputMethodChanged ||
      profileCompletionChanged ||
      verificationChanged

    const hasValidPasswordChange =
      passwordChanged &&
      passwordIsValid

    const hasChanges =
      hasNonPasswordChanges ||
      hasValidPasswordChange

    if (!hasChanges) {
      if (
        !passwordIsValid
      ) {
        return
      }

      if (
        isMultiUserEdit &&
        editSelectionIndex <
          selectedUserIds.length - 1
      ) {
        handleNextSelectedUser()
      } else {
        closeEdit()
      }

      return
    }

    setIsSaving(true)
    setError('')

    try {
      const payload: UpdateAdminUserData = {}

      if (nameChanged) {
        payload.name =
          editState.name.trim()
      }

      if (emailChanged) {
        payload.email =
          editState.email.trim()
      }

      if (mobileChanged) {
        payload.mobile =
          editState.mobile.trim()
      }

      if (
        passwordChanged &&
        passwordIsValid
      ) {
        payload.password =
          newPassword
      }

      if (roleChanged) {
        payload.role =
          editState.role
      }

      if (statusChanged) {
        payload.status =
          editState.status
      }

      if (
        preferredLanguageChanged
      ) {
        payload.preferredLanguage =
          editState.preferredLanguage.trim()
      }

      if (
        preferredInputMethodChanged
      ) {
        payload.preferredInputMethod =
          editState.preferredInputMethod
      }

      if (
        profileCompletionChanged
      ) {
        payload.profileCompletion =
          profileCompletionValue
      }

      if (verificationChanged) {
        payload.isVerified =
          editState.isVerified
      }

      const updatedUser =
        await api.updateUser(
          editState.user.id,
          payload,
          accessToken,
        )

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id
            ? updatedUser
            : user,
        ),
      )

      setNotice(
        `Updated ${
          updatedUser.name ||
          updatedUser.email
        }.`,
      )

      setEditPasswordError('')

      if (
        isMultiUserEdit &&
        editSelectionIndex <
          selectedUserIds.length - 1
      ) {
        handleNextSelectedUser()
      } else {
        closeEdit()
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to update the user.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  // ==========================================================
  // LOAD USER ACTIVITY
  // ==========================================================

  const openActivity = async (
    user: AdminUser,
  ) => {
    if (!accessToken) {
      return
    }

    setActivityUser(user)
    setActivity([])
    setIsActivityLoading(true)

    try {
      const result =
        await api.userActivity(
          user.id,
          accessToken,
          50,
        )

      setActivity(result)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load user activity.',
      )
    } finally {
      setIsActivityLoading(false)
    }
  }

  const closeActivity = () => {
    if (isActivityLoading) {
      return
    }

    setActivityUser(null)
    setActivity([])
  }

  // ==========================================================
  // CURRENT USER PROTECTION
  // ==========================================================

  const isEditingCurrentUser =
    editState?.user.id ===
    currentUser?.id

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------
          Page header
          ------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-medium text-muted-foreground">
            Platform Administration
          </div>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Users
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Manage platform users, roles, account status, activity,
            and access-related administration from one control surface.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create user
        </Button>
      </div>

      {/* ------------------------------------------------------
          Summary cards
          ------------------------------------------------------ */}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard
          label="Total users"
          value={users.length}
          description="All accounts returned by the platform"
        />

        <SummaryCard
          label="Recently active"
          value={activeUserCount}
          description="Activity within the last 5 minutes"
        />

        <SummaryCard
          label="Active accounts"
          value={
            users.filter(
              (user) =>
                user.status === 'ACTIVE',
            ).length
          }
          description="Accounts currently marked active"
        />
      </div>

      {/* ------------------------------------------------------
          Notices
          ------------------------------------------------------ */}

      {notice && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{notice}</span>
          </div>

          <button
            type="button"
            onClick={() => setNotice('')}
            className="rounded p-1 hover:bg-emerald-100"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() => setError('')}
            className="rounded p-1 hover:bg-red-100"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ------------------------------------------------------
          Search and filters
          ------------------------------------------------------ */}

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

            <input
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by name, email or mobile..."
              className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <FilterSelect
            value={roleFilter}
            onChange={setRoleFilter}
            placeholder="All roles"
            options={ROLES}
          />

          <FilterSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="All statuses"
            options={STATUSES}
          />
        </div>
      </div>

      {/* ------------------------------------------------------
          Selection toolbar
          ------------------------------------------------------ */}

      {selectedUserIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">
              {selectedUserIds.length} user
              {selectedUserIds.length === 1
                ? ''
                : 's'} selected
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Edit opens users one at a time. Each user is saved independently.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setSelectedUserIds([])
              }
            >
              Clear selection
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={
                openSelectedUsersEdit
              }
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isBulkDeleting}
              onClick={handleBulkDelete}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isBulkDeleting
                ? 'Deleting...'
                : 'Delete selected'}
            </Button>
          </div>
        </div>
      )}
	      {/* ------------------------------------------------------
          Table summary
          ------------------------------------------------------ */}

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of{' '}
          {users.length} users
        </div>

        {search ||
        roleFilter !== 'ALL' ||
        statusFilter !== 'ALL' ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setRoleFilter('ALL')
              setStatusFilter('ALL')
            }}
            className="text-sm font-medium text-primary hover:underline"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------
          Users table
          ------------------------------------------------------ */}

      <UsersTable
        users={filteredUsers}
        isLoading={isLoading}
        totalUsers={users.length}
        selectedUserIds={selectedUserIds}
        onToggleUser={toggleUserSelection}
        onToggleAll={toggleSelectAll}
        onEdit={openRowEdit}
        onActivity={openActivity}
        formatRole={formatRole}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
        isRecentlyActive={isRecentlyActive}
        statusClass={statusClass}
      />

      {/* ------------------------------------------------------
          Create dialog
          ------------------------------------------------------ */}

      <UserCreateDialog
        open={showCreate}
        onClose={() => {
          if (!isCreating) {
            setShowCreate(false)
          }
        }}
        name={createName}
        email={createEmail}
        password={createPassword}
        isCreating={isCreating}
        onNameChange={setCreateName}
        onEmailChange={setCreateEmail}
        onPasswordChange={setCreatePassword}
        onSubmit={handleCreate}
      />

      {/* ------------------------------------------------------
          Edit dialog
          ------------------------------------------------------ */}

      <UserEditDialog
        editState={editState}
        isSaving={isSaving}
        editPasswordError={editPasswordError}
        isMultiUserEdit={isMultiUserEdit}
        editSelectionIndex={editSelectionIndex}
        selectedUserCount={
          selectedUserIds.length
        }
        isEditingCurrentUser={
          isEditingCurrentUser
        }
        roles={ROLES}
        statuses={STATUSES}
        onClose={closeEdit}
        onSave={handleSave}
        onPrevious={
          handlePreviousSelectedUser
        }
        onNext={
          handleNextSelectedUser
        }
        onChange={setEditState}
        formatDate={formatDate}
        formatDateTime={formatDateTime}
      />

      {/* ------------------------------------------------------
          Activity dialog
          ------------------------------------------------------ */}

      <UserActivityDialog
        user={activityUser}
        activity={activity}
        isLoading={isActivityLoading}
        onClose={closeActivity}
        formatRole={formatRole}
        formatDateTime={formatDateTime}
      />
    </div>
  )
}

// ============================================================
// PAGE-LOCAL VISUAL HELPERS
// ============================================================

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string
  value: ReactNode
  description: string
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="text-sm font-medium text-muted-foreground">
        {label}
      </div>

      <div className="mt-2 text-3xl font-semibold tracking-tight">
        {value}
      </div>

      <div className="mt-1 text-xs text-muted-foreground">
        {description}
      </div>
    </div>
  )
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string
  onChange: (value: string) => void
  placeholder: string
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="ALL">
        {placeholder}
      </option>

      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {formatRole(option)}
        </option>
      ))}
    </select>
  )
}

// ============================================================
// USERS PAGE END
// ============================================================