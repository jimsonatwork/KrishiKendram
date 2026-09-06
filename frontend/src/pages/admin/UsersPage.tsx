// ============================================================
// USERS PAGE
// File: src/pages/admin/UsersPage.tsx
//
// PART 01 - IMPORTS, CONSTANTS, FORMATTERS & SHARED TYPES
//
// This section contains:
// - External and project imports
// - Supported platform roles and account statuses
// - Activity timing configuration
// - Display/formatting helpers
// - Status/activity styling helpers
// - Edit dialog state definition
//
// FUTURE UPDATE GUIDE:
// If a future change affects role names, account statuses,
// date formatting, activity styling, or edit-state structure,
// start in this part before changing the main UsersPage logic.
// ============================================================

import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  CheckCircle2,
  Loader2,
  Pencil,
  Plus,
  Search,
  X,
  AlertTriangle,
	ChevronLeft,
	ChevronRight,
	Save,
	ShieldAlert,
	Trash2,
	Users,
} from 'lucide-react'

import {
  api,
  type AdminUser,
  type AuditEvent,
  type UpdateAdminUserData,
} from '@/lib/api'
import { useAuthStore } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'

// ============================================================
// PLATFORM ROLE DEFINITIONS
//
// These values must remain aligned with the backend UserRole
// enum. They are currently used by the Users page for role
// filtering and role editing.
//
// FUTURE UPDATE GUIDE:
// When a new platform role is added to Prisma/backend,
// update this list so Super Admin can see and manage it here.
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
//
// These values must remain aligned with the backend UserStatus
// enum. They are used for filtering and account-status editing.
//
// FUTURE UPDATE GUIDE:
// If account lifecycle states are added or renamed in the
// backend, update this list and statusClass() below together.
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
//
// A user is displayed as "Recently active" when lastSeenAt is
// within this time window.
//
// FUTURE UPDATE GUIDE:
// Change this value if the platform later defines a different
// operational meaning for "recently active".
// ============================================================

const ACTIVE_WINDOW_MS = 5 * 60 * 1000

// ============================================================
// DISPLAY FORMATTERS
//
// These helpers convert backend values such as SUPER_ADMIN or
// PENDING_DELETE into readable UI text.
//
// FUTURE UPDATE GUIDE:
// Keep backend enum values unchanged. Modify presentation here
// when the UI needs different labels.
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
//
// Determines whether the user's lastSeenAt timestamp falls
// inside the configured recent-activity window.
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
//
// Maps backend status values to the visual treatment used by
// status badges throughout the Users page.
//
// FUTURE UPDATE GUIDE:
// Add a case here whenever a new UserStatus is introduced.
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
// AUDIT ACTIVITY STYLING
//
// Maps known audit actions to their visual treatment in the
// User Activity dialog.
//
// FUTURE UPDATE GUIDE:
// When new important audit actions are introduced, add their
// visual classification here. Unknown actions intentionally
// fall back to the primary style.
// ============================================================

const activityClass = (action: string) => {
  switch (action) {
    case 'LOGIN':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'

    case 'LOGOUT':
      return 'bg-muted text-muted-foreground'

    case 'USER_CREATED':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400'

    case 'ROLE_CHANGED':
      return 'bg-violet-500/10 text-violet-600 dark:text-violet-400'

    case 'STATUS_CHANGED':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400'

    default:
      return 'bg-primary/10 text-primary'
  }
}

// // ============================================================
// EDIT DIALOG STATE
//
// The edit dialog contains the user fields that Super Admin can
// manage through the current Users API.
//
// SECURITY NOTE:
// - Password is a NEW password only and is never populated from
//   the existing user record.
// - passwordHash, refreshTokenHash, login-lock fields, deletion
//   internals, and timestamps remain system-managed.
//
// MULTI-USER EDIT:
// Each selected user receives its own independent EditState.
// Saving one user never automatically changes another user.
// ============================================================

type EditState = {
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
// PART 01 END
//
// Next section in the SAME FILE:
// PART 02 - UsersPage state and selection management
// ============================================================
// ============================================================
// PART 02 - USERS PAGE STATE & SELECTION MANAGEMENT
//
// This section contains:
// - Authentication context
// - User list state
// - Search and filter state
// - Edit dialog state
// - Multi-user selection state
// - Create-user state
// - Activity dialog state
// - Individual user selection
// - Select-all behavior
//
// FUTURE UPDATE GUIDE:
// Changes related to page-level state, selected users, dialog
// state, or selection behavior should start in this section.
//
// IMPORTANT:
// This page remains the coordinator for the Users domain.
// We are refactoring the structure without introducing a
// generic CRUD framework or changing the backend contract.
// ============================================================

export function UsersPage() {
  // ==========================================================
  // AUTHENTICATION CONTEXT
  //
  // accessToken is required for all protected Users API calls.
  // currentUser is used to identify the logged-in user inside
  // the table and to protect the self-edit experience.
  // ==========================================================

  const {
    user: currentUser,
    accessToken,
  } = useAuthStore()

  // ==========================================================
  // USER LIST STATE
  //
  // users is the authoritative list currently loaded from the
  // backend for this page.
  // ==========================================================

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // ==========================================================
  // SEARCH & FILTER STATE
  //
  // These values affect only the displayed/filtered list.
  // They do not modify backend data.
  // ==========================================================

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // ==========================================================
  // EDIT STATE
  //
  // editState contains the user currently being reviewed in
  // the Edit dialog and the proposed role/status values.
  //
  // There is intentionally only ONE editState declaration.
  // The previous version contained a duplicate declaration,
  // which caused a TypeScript compilation error.
  // ==========================================================

  const [editState, setEditState] =
    useState<EditState>(null)

  const [isSaving, setIsSaving] = useState(false)

  // ==========================================================
  // MULTI-USER SELECTION STATE
  //
  // selectedUserIds stores the IDs selected in the table.
  //
  // Multi-user editing does NOT perform a bulk API update.
  // Each selected user is still reviewed and saved individually.
  // ==========================================================

  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>([])

  const [editSelectionIndex, setEditSelectionIndex] =
    useState(0)

  /*
   * IMPORTANT:
   *
   * This separates normal row editing from
   * multi-user editing.
   *
   * Clicking Edit on a row can start normal
   * individual editing unless the row is part
   * of an active multi-selection.
   *
   * Clicking Edit from the selection toolbar
   * enables this only when multiple users are
   * selected.
   */
  const [isMultiUserEdit, setIsMultiUserEdit] =
    useState(false)

  // ==========================================================
  // BULK DELETE STATE
  //
  // Bulk deletion uses the existing backend operation.
  // This is intentionally separate from role/status editing.
  // ==========================================================

  const [isBulkDeleting, setIsBulkDeleting] =
    useState(false)

  // ==========================================================
  // CREATE USER STATE
  //
  // Create-user currently collects the fields supported by the
  // existing createUser API flow.
  //
  // The backend remains responsible for assigning the initial
  // role/status according to the current platform rules.
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
  // PAGE FEEDBACK STATE
  //
  // notice is used for successful/non-error operations.
  // error is the page-level error message.
  // ==========================================================

  const [notice, setNotice] = useState('')

  // ==========================================================
  // USER ACTIVITY STATE
  //
  // Activity is loaded only when the Super Admin opens the
  // activity dialog for a specific user.
  // ==========================================================

  const [activityUser, setActivityUser] =
    useState<AdminUser | null>(null)

  const [activity, setActivity] =
    useState<AuditEvent[]>([])

  const [isActivityLoading, setIsActivityLoading] =
    useState(false)

  // ==========================================================
  // INDIVIDUAL USER SELECTION
  //
  // Toggles one user's checkbox without affecting the rest of
  // the current selection.
  // ==========================================================

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((current) =>
      current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    )
  }

  // ==========================================================
  // SELECT ALL FILTERED USERS
  //
  // "Select all" applies to the currently filtered table rows,
  // not necessarily every user loaded from the backend.
  //
  // This allows a Super Admin to search/filter first and then
  // select only the users currently visible.
  // ==========================================================

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

  // ============================================================
  // PART 02 END
  //
  // Next section in the SAME FILE:
  // PART 03 - User loading, filtering, creation and bulk delete
  // ============================================================
  // ============================================================
// PART 03 - USER LOADING, FILTERING, BULK DELETE & CREATION
//
// This section contains:
// - Bulk deletion
// - Loading users from the backend
// - Automatic reload when authentication changes
// - Search/filter processing
// - Recently-active user summary calculation
// - Create-user submission
//
// FUTURE UPDATE GUIDE:
// Backend API changes related to users should be handled here
// before changing the presentation components.
//
// IMPORTANT:
// The backend remains the final authority for authorization,
// validation, role changes, status changes, and deletion rules.
// The frontend only requests the operation and reflects the
// backend result.
// ============================================================

// ============================================================
// BULK DELETE USERS
//
// This operation uses the existing bulkDeleteUsers API.
// It intentionally remains separate from multi-user editing.
//
// Multi-user Edit = sequential individual saves.
// Bulk Delete    = existing backend bulk operation.
// ============================================================

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

      /*
       * Clear the selection immediately after the
       * backend accepts the bulk deletion request.
       */
      setSelectedUserIds([])

      /*
       * Reload from the backend so the table reflects
       * the authoritative account state.
       */
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

// ============================================================
// LOAD USERS
//
// Retrieves the current user list from the backend.
//
// FUTURE UPDATE GUIDE:
// If pagination, server-side filtering, sorting, or additional
// user-management query parameters are introduced, this is the
// primary function to update.
// ============================================================

  const loadUsers = async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await api.users(
        accessToken,
      )

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

// ============================================================
// INITIAL / AUTHENTICATION-DEPENDENT USER LOAD
//
// Whenever accessToken becomes available or changes, reload
// the Users page from the backend.
//
// This keeps the page tied to the currently authenticated
// session instead of retaining stale user data.
// ============================================================

  useEffect(() => {
    void loadUsers()
  }, [accessToken])

// ============================================================
// CLIENT-SIDE SEARCH & FILTERING
//
// Search currently covers:
// - Name
// - Email
// - Mobile
//
// Role and status filters use the backend enum values.
//
// FUTURE UPDATE GUIDE:
// If the Users API later provides server-side filtering,
// this memo can be replaced by query parameters in loadUsers()
// without changing the table's rendering contract.
// ============================================================

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

// ============================================================
// RECENTLY ACTIVE USER COUNT
//
// This is a presentation summary derived from lastSeenAt.
// It does not represent an authorization or account-status
// decision.
// ============================================================

  const activeUserCount = useMemo(
    () =>
      users.filter((user) =>
        isRecentlyActive(user.lastSeenAt),
      ).length,
    [users],
  )

// ============================================================
// CREATE USER
//
// The current create flow intentionally sends only the fields
// supported by the existing API.
//
// The current backend behavior creates the account with the
// platform's configured initial role/status. The page displays
// that behavior as Farmer + Pending.
//
// FUTURE UPDATE GUIDE:
// If Super Admin later receives explicit role/status selection
// during creation, update this function together with the
// Create User dialog and API DTO.
// ============================================================

  const handleCreate = async (
    event: React.FormEvent,
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

      /*
       * Clear sensitive form values after successful creation.
       */
      setCreateName('')
      setCreateEmail('')
      setCreatePassword('')
      setShowCreate(false)

      setNotice(
        'User created successfully. The new user is currently PENDING.',
      )

      /*
       * Reload the list so the newly-created user appears
       * using backend-authoritative data.
       */
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

// ============================================================
// PART 03 END
//
// Next section in the SAME FILE:
// PART 04 - Individual and multi-user edit workflow
// ============================================================

// ============================================================
// PART 04 - INDIVIDUAL & MULTI-USER EDIT WORKFLOW
//
// This section contains:
// - Normal row editing
// - Multi-user sequential editing
// - Selected-user navigation
// - Individual save behavior
// - User activity loading
// - Current-user protection indicator
//
// FUTURE UPDATE GUIDE:
// Changes to role/status editing, multi-user navigation,
// save sequencing, or activity loading should start here.
//
// IMPORTANT:
// Multi-user editing is deliberately sequential. Each API call
// updates exactly one user. There is no bulk role/status update.
// ============================================================

  // ----------------------------------------------------------
  // Open a normal single-user edit dialog.
  //
  // This is the default path when the user clicks Edit on a row
  // without an active multi-user selection context.
  // ----------------------------------------------------------
  const openEdit = (user: AdminUser) => {
    setIsMultiUserEdit(false)
    setEditSelectionIndex(0)

setEditState({
  user,
  name: user.name ?? '',
  email: user.email ?? '',
  mobile: user.mobile ?? '',
  // Password is intentionally blank. Existing passwords are
  // never returned by the backend and must never be displayed.
  password: '',
  role: user.role,
  status: user.status,
  preferredLanguage: user.preferredLanguage ?? '',
  preferredInputMethod: user.preferredInputMethod ?? 'MIXED',
  profileCompletion: String(user.profileCompletion ?? 0),
  isVerified: user.isVerified ?? false,
})
  }

  // ----------------------------------------------------------
  // Row edit entry point.
  //
  // If the clicked user belongs to a multi-user selection with
  // more than one selected user, preserve that selection and
  // enter sequential edit mode.
  //
  // Otherwise, edit only the clicked user.
  // ----------------------------------------------------------
  const openRowEdit = (user: AdminUser) => {
    const selectedIndex = selectedUserIds.indexOf(user.id)

    if (selectedUserIds.length > 1 && selectedIndex >= 0) {
      setIsMultiUserEdit(true)
      setEditSelectionIndex(selectedIndex)

setEditState({
  user,
  name: user.name ?? '',
  email: user.email ?? '',
  mobile: user.mobile ?? '',
  // Password is intentionally blank. Existing passwords are
  // never returned by the backend and must never be displayed.
  password: '',
  role: user.role,
  status: user.status,
  preferredLanguage: user.preferredLanguage ?? '',
  preferredInputMethod: user.preferredInputMethod ?? 'MIXED',
  profileCompletion: String(user.profileCompletion ?? 0),
  isVerified: user.isVerified ?? false,
})

      return
    }

    openEdit(user)
  }

  // ----------------------------------------------------------
  // Open the edit dialog for the currently selected users.
  //
  // Selection order is preserved from selectedUserIds.
  // The first selected user becomes the initial edit target.
  //
  // Stale IDs are removed before opening the dialog so the edit
  // workflow never tries to operate on users that are no longer
  // present in the loaded user list.
  // ----------------------------------------------------------
  const openSelectedUsersEdit = () => {
    const validSelectedIds = selectedUserIds.filter((id) =>
      users.some((user) => user.id === id),
    )

    if (validSelectedIds.length === 0) {
      setSelectedUserIds([])
      return
    }

    if (validSelectedIds.length !== selectedUserIds.length) {
      setSelectedUserIds(validSelectedIds)
    }

    const firstUser = users.find(
      (user) => user.id === validSelectedIds[0],
    )

    if (!firstUser) {
      return
    }

    setIsMultiUserEdit(validSelectedIds.length > 1)
    setEditSelectionIndex(0)

    // ----------------------------------------------------------
    // Initialize the edit state with all editable user fields.
    //
    // Password is intentionally blank. Existing passwords are
    // never returned by the backend and must never be displayed.
    // ----------------------------------------------------------
       setEditState({
      user: firstUser,
      name: firstUser.name ?? '',
      email: firstUser.email ?? '',
      mobile: firstUser.mobile ?? '',
      password: '',
      role: firstUser.role,
      status: firstUser.status,
      preferredLanguage: firstUser.preferredLanguage ?? '',
      preferredInputMethod:
        firstUser.preferredInputMethod ?? 'MIXED',
      profileCompletion: String(
        firstUser.profileCompletion ?? 0,
      ),
      isVerified: firstUser.isVerified ?? false,
    })
  }

  // ----------------------------------------------------------
  // Open a specific selected user by its selection index.
  //
  // This does not save anything. It only changes the current
  // edit target so the administrator can review users one by one.
  // ----------------------------------------------------------
  const openSelectedUserAtIndex = (index: number) => {
    if (index < 0 || index >= selectedUserIds.length) {
      return
    }

    const userId = selectedUserIds[index]
    const user = users.find((item) => item.id === userId)

    if (!user) {
      return
    }

    setEditSelectionIndex(index)

setEditState({
  user,
  name: user.name ?? '',
  email: user.email ?? '',
  mobile: user.mobile ?? '',
  // Password is intentionally blank. Existing passwords are
  // never returned by the backend and must never be displayed.
  password: '',
  role: user.role,
  status: user.status,
  preferredLanguage: user.preferredLanguage ?? '',
  preferredInputMethod: user.preferredInputMethod ?? 'MIXED',
  profileCompletion: String(user.profileCompletion ?? 0),
  isVerified: user.isVerified ?? false,
})
  }

  // ----------------------------------------------------------
  // Move to the next selected user.
  //
  // Navigation is intentionally separate from saving. The current
  // user's changes are only sent to the backend when Save is used.
  // ----------------------------------------------------------
  const handleNextSelectedUser = () => {
    const nextIndex = editSelectionIndex + 1

    if (nextIndex >= selectedUserIds.length) {
      return
    }

    openSelectedUserAtIndex(nextIndex)
  }

  // ----------------------------------------------------------
  // Move to the previous selected user.
  // ----------------------------------------------------------
  const handlePreviousSelectedUser = () => {
    const previousIndex = editSelectionIndex - 1

    if (previousIndex < 0) {
      return
    }

    openSelectedUserAtIndex(previousIndex)
  }

  // ----------------------------------------------------------
  // Close the edit dialog and reset its workflow state.
  //
  // Do not allow the dialog to close while a save request is
  // currently being processed.
  // ----------------------------------------------------------
  const closeEdit = () => {
    if (isSaving) {
      return
    }

    setEditState(null)
    setIsMultiUserEdit(false)
    setEditSelectionIndex(0)
  }

  // ----------------------------------------------------------
  // Save the currently displayed user's role/status changes.
  //
  // IMPORTANT:
  // - Only one user is updated per API request.
  // - Unchanged fields are not sent.
  // - Backend authorization remains the final authority.
  // - In multi-user mode, saving one user advances to the next
  //   user without automatically saving that next user.
  // ----------------------------------------------------------
  const handleSave = async () => {
    if (!editState || !accessToken) {
      return
    }

    // ============================================================
// EDIT CHANGE DETECTION
//
// Compare every Super Admin-editable field against the current
// backend user snapshot.
//
// Password is handled separately because it is never loaded from
// the existing account. A non-empty value always means:
// "set this as the new password."
// ============================================================

const nameChanged =
  editState.name.trim() !== editState.user.name

const emailChanged =
  editState.email.trim() !== (editState.user.email ?? '')

const mobileChanged =
  editState.mobile.trim() !== (editState.user.mobile ?? '')

const passwordChanged =
  editState.password.trim().length > 0

const roleChanged =
  editState.role !== editState.user.role

const statusChanged =
  editState.status !== editState.user.status

const preferredLanguageChanged =
  editState.preferredLanguage.trim() !==
  (editState.user.preferredLanguage ?? '')

const preferredInputMethodChanged =
  editState.preferredInputMethod !==
  editState.user.preferredInputMethod

const profileCompletionValue =
  Number(editState.profileCompletion)

const profileCompletionChanged =
  Number.isInteger(profileCompletionValue) &&
  profileCompletionValue !== editState.user.profileCompletion

const verificationChanged =
  editState.isVerified !== editState.user.isVerified

const hasChanges =
  nameChanged ||
  emailChanged ||
  mobileChanged ||
  passwordChanged ||
  roleChanged ||
  statusChanged ||
  preferredLanguageChanged ||
  preferredInputMethodChanged ||
  profileCompletionChanged ||
  verificationChanged

// Nothing changed. In multi-user mode, continue reviewing
// the selected users without making an unnecessary API call.
if (!hasChanges) {
      if (
        isMultiUserEdit &&
        editSelectionIndex < selectedUserIds.length - 1
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
 // ============================================================
// UPDATE PAYLOAD
//
// Only changed fields are sent.
// Empty optional values are normalized to undefined so the
// backend receives intentional changes without unnecessary data.
// ============================================================

const payload: UpdateAdminUserData = {}

if (nameChanged) {
  payload.name = editState.name.trim()
}

if (emailChanged) {
  payload.email = editState.email.trim()
}

if (mobileChanged) {
  payload.mobile = editState.mobile.trim()
}

if (passwordChanged) {
  payload.password = editState.password.trim()
}

if (roleChanged) {
  payload.role = editState.role
}

if (statusChanged) {
  payload.status = editState.status
}

if (preferredLanguageChanged) {
  payload.preferredLanguage =
    editState.preferredLanguage.trim()
}

if (preferredInputMethodChanged) {
  payload.preferredInputMethod =
    editState.preferredInputMethod
}

if (profileCompletionChanged) {
  payload.profileCompletion =
    profileCompletionValue
}

if (verificationChanged) {
  payload.isVerified = editState.isVerified
}

      const updatedUser = await api.updateUser(
        editState.user.id,
        payload,
        accessToken,
      )

      // Reflect the backend response locally so the table does not
      // need a full reload after every individual edit.
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === updatedUser.id ? updatedUser : user,
        ),
      )

      setNotice(`Updated ${updatedUser.name || updatedUser.email}.`)

      // In sequential multi-user mode, move to the next selected
      // user only after the current API request succeeds.
      if (
        isMultiUserEdit &&
        editSelectionIndex < selectedUserIds.length - 1
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

  // ----------------------------------------------------------
  // Load recent activity for a specific user.
  //
  // Activity remains a separate read operation from user editing.
  // This keeps the Users page coordinator simple and preserves the
  // existing backend activity endpoint.
  // ----------------------------------------------------------
  const openActivity = async (user: AdminUser) => {
    if (!accessToken) {
      return
    }

    setActivityUser(user)
    setActivity([])
    setIsActivityLoading(true)

    try {
      const result = await api.userActivity(
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

  // ----------------------------------------------------------
  // Current-user protection indicator.
  //
  // The UI uses this value to warn the Super Admin when they are
  // editing their own account. Backend authorization remains the
  // actual enforcement layer.
  // ----------------------------------------------------------
  const isEditingCurrentUser =
    editState?.user.id === currentUser?.id

// ============================================================
// PART 04 END
//
// Next section in the SAME FILE:
// PART 05 - Users page presentation / main JSX
// ============================================================
// ============================================================
// PART 05 - USERS PAGE PRESENTATION / MAIN JSX
//
// This section contains:
// - Page header
// - Summary cards
// - Notice and error messages
// - Search and filters
// - Selection / bulk-action controls
// - Users table
// - Create-user dialog
// - Edit-user dialog
// - Activity dialog
//
// FUTURE UPDATE GUIDE:
// Changes to the Users page layout, table columns, filters,
// dialogs, or page-level actions should start here.
//
// IMPORTANT:
// This presentation layer intentionally remains coordinated by
// UsersPage. We are not introducing a generic CRUD framework.
// Domain-specific behavior remains attached to the Users domain.
// ============================================================

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
            users.filter((user) => user.status === 'ACTIVE').length
          }
          description="Accounts currently marked active"
        />
      </div>

      {/* ------------------------------------------------------
          Page notices
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
              onChange={(event) => setSearch(event.target.value)}
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
          Selection and bulk actions
          ------------------------------------------------------ */}
      {selectedUserIds.length > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-medium">
              {selectedUserIds.length} user
              {selectedUserIds.length === 1 ? '' : 's'} selected
            </div>

            <div className="mt-1 text-xs text-muted-foreground">
              Edit opens users one at a time. Each user is saved
              independently.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedUserIds([])}
            >
              Clear selection
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openSelectedUsersEdit}
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
              {isBulkDeleting ? 'Deleting...' : 'Delete selected'}
            </Button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------
          Table summary
          ------------------------------------------------------ */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </div>

        {search || roleFilter || statusFilter ? (
          <button
            type="button"
            onClick={() => {
              setSearch('')
              setRoleFilter('')
              setStatusFilter('')
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
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        {isLoading ? (
          <LoadingState />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            title="No users found"
            description={
              users.length === 0
                ? 'There are no users available yet.'
                : 'Try changing your search or filters.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th className="w-12 px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.length > 0 &&
                        filteredUsers.every((user) =>
                          selectedUserIds.includes(user.id),
                        )
                      }
                      onChange={toggleSelectAll}
                      aria-label="Select all visible users"
                      className="h-4 w-4 rounded border"
                    />
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    User
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Role
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Status
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Activity
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Last login
                  </th>

                  <th className="px-4 py-3 text-left font-medium">
                    Created
                  </th>

                  <th className="px-4 py-3 text-right font-medium">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUserIds.includes(user.id)
const recentlyActive = isRecentlyActive(user.lastLoginAt)

                  return (
                    <tr
                      key={user.id}
                      className={
                        isSelected
                          ? 'bg-muted/30'
                          : 'hover:bg-muted/20'
                      }
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() =>
                            toggleUserSelection(user.id)
                          }
                          aria-label={`Select ${user.name || user.email}`}
                          className="h-4 w-4 rounded border"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                            {(user.name || user.email || '?')
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div className="min-w-0">
                            <div className="truncate font-medium">
                              {user.name || 'Unnamed user'}
                            </div>

                            <div className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </div>

                            {user.mobile ? (
                              <div className="truncate text-xs text-muted-foreground">
                                {user.mobile}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border px-2.5 py-1 text-xs font-medium">
                          {formatRole(user.role)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClass(
                            user.status,
                          )}`}
                        >
                          {formatRole(user.status)}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2.5 w-2.5 rounded-full ${
                              recentlyActive
                                ? 'bg-emerald-500'
                                : 'bg-muted-foreground/30'
                            }`}
                          />

                          <span
                            className={`text-xs font-medium ${activityClass(
  recentlyActive ? 'ACTIVE' : 'INACTIVE',
)}`}
                          >
                            {recentlyActive
                              ? 'Recently active'
                              : 'Not recently active'}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDateTime(user.lastLoginAt)}
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openActivity(user)}
                          >
                            <Activity className="mr-2 h-4 w-4" />
                            Activity
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openRowEdit(user)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================
          CREATE USER DIALOG
          ====================================================== */}
      <Modal
        open={showCreate}
        onClose={() => {
          if (!isCreating) {
            setShowCreate(false)
          }
        }}
        title="Create user"
        description="Create a new platform account."
      >
        <form onSubmit={handleCreate} className="space-y-5">
          <Field label="Name" required>
            <input
              value={createName}
              onChange={(event) =>
                setCreateName(event.target.value)
              }
              placeholder="Enter full name"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              value={createEmail}
              onChange={(event) =>
                setCreateEmail(event.target.value)
              }
              placeholder="name@example.com"
              required
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Password" required>
            <input
              type="password"
              value={createPassword}
              onChange={(event) =>
                setCreatePassword(event.target.value)
              }
              placeholder="Enter temporary password"
              required
              minLength={8}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="font-medium">Initial account settings</div>

            <div className="mt-2 grid gap-2 text-muted-foreground sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">
                  Role:
                </span>{' '}
                Farmer
              </div>

              <div>
                <span className="font-medium text-foreground">
                  Status:
                </span>{' '}
                Pending
              </div>
            </div>

            <p className="mt-3 text-xs">
              Role and status can be managed from the Edit action
              after the account is created.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isCreating}
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isCreating}>
              {isCreating ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create user
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ======================================================
          EDIT USER DIALOG
          ====================================================== */}
{/* ======================================================
    EDIT USER DIALOG

    This dialog edits one selected user at a time.
    Multi-user editing remains sequential: the Super Admin
    reviews and saves each selected user individually.

    Password is intentionally a NEW password field only.
    Existing passwords are never returned by the backend.
    ====================================================== */}
<Modal
  open={Boolean(editState)}
  onClose={closeEdit}
  title={
    isMultiUserEdit
      ? 'Edit selected users'
      : 'Edit user'
  }
  description={
    isMultiUserEdit
      ? 'Review and save each selected user individually.'
      : 'Manage user identity, preferences, access, and account status.'
  }
>
  {editState && (
    <div className="space-y-6">

      {/* ==================================================
          MULTI-USER NAVIGATION
          ================================================== */}
      {isMultiUserEdit ? (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-medium">
              User {editSelectionIndex + 1} of {selectedUserIds.length}
            </p>

            <p className="text-xs text-muted-foreground">
              Save this user before moving to the next one.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviousSelectedUser}
              disabled={editSelectionIndex <= 0 || isSaving}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextSelectedUser}
              disabled={
                editSelectionIndex >= selectedUserIds.length - 1 ||
                isSaving
              }
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      {/* ==================================================
          USER IDENTITY
          ================================================== */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              User ID
            </p>

            <p className="mt-1 break-all font-mono text-xs">
              {editState.user.id}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              Created
            </p>

            <p className="mt-1 text-sm">
              {formatDate(editState.user.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================
          CURRENT USER PROTECTION
          ================================================== */}
      {isEditingCurrentUser ? (
        <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />

          <div>
            <p className="text-sm font-medium">
              You are editing your own account
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              Be careful when changing your own role or account status.
              Backend security rules remain the final authority.
            </p>
          </div>
        </div>
      ) : null}

      {/* ==================================================
          BASIC IDENTITY
          ================================================== */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">
            Basic information
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Update the user's primary identity and contact details.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <Field label="Name" required>
            <input
              type="text"
              value={editState.name}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        name: event.target.value,
                      }
                    : current,
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              value={editState.email}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        email: event.target.value,
                      }
                    : current,
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="Mobile">
            <input
              type="tel"
              value={editState.mobile}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        mobile: event.target.value,
                      }
                    : current,
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <Field label="New password">
            <input
              type="password"
              value={editState.password}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        password: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <p className="text-xs text-muted-foreground">
              Enter a password only if you want to set a new one.
            </p>
          </Field>

        </div>
      </div>

      {/* ==================================================
          ACCESS AND ACCOUNT STATE
          ================================================== */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">
            Access and account
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Manage the user's role and account lifecycle state.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <SelectField
            label="Role"
            value={editState.role}
            onChange={(value) =>
              setEditState((current) =>
                current
                  ? {
                      ...current,
                      role: value,
                    }
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
                  ? {
                      ...current,
                      status: value,
                    }
                  : current,
              )
            }
            options={STATUSES}
          />

        </div>

        {/* ==================================================
            SUPER ADMIN SAFETY
            ================================================== */}
        {editState.user.role === 'SUPER_ADMIN' ||
        editState.role === 'SUPER_ADMIN' ? (
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

            <div>
              <p className="text-sm font-medium">
                Super Admin protection
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Changes affecting Super Admin access are protected by
                backend authorization and last-Super-Admin safeguards.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* ==================================================
          USER PREFERENCES
          ================================================== */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">
            Preferences
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Configure language and preferred interaction method.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <Field label="Preferred language">
            <input
              type="text"
              value={editState.preferredLanguage}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        preferredLanguage: event.target.value,
                      }
                    : current,
                )
              }
              placeholder="e.g. en"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </Field>

          <SelectField
            label="Preferred input method"
            value={editState.preferredInputMethod}
            onChange={(value) =>
              setEditState((current) =>
                current
                  ? {
                      ...current,
                      preferredInputMethod: value,
                    }
                  : current,
              )
            }
            options={['VOICE', 'TEXT', 'MIXED']}
          />

        </div>
      </div>

      {/* ==================================================
          PROFILE STATE
          ================================================== */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">
            Profile state
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Manage profile completion and verification state.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">

          <Field label="Profile completion">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={editState.profileCompletion}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        profileCompletion: event.target.value,
                      }
                    : current,
                )
              }
              className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />

            <p className="text-xs text-muted-foreground">
              Enter a value from 0 to 100.
            </p>
          </Field>

          <label className="flex items-center gap-3 rounded-md border px-3 py-2">
            <input
              type="checkbox"
              checked={editState.isVerified}
              onChange={(event) =>
                setEditState((current) =>
                  current
                    ? {
                        ...current,
                        isVerified: event.target.checked,
                      }
                    : current,
                )
              }
              className="h-4 w-4 rounded border"
            />

            <span>
              <span className="block text-sm font-medium">
                Verified user
              </span>

              <span className="block text-xs text-muted-foreground">
                Mark whether the user's account is verified.
              </span>
            </span>
          </label>

        </div>
      </div>

      {/* ==================================================
          SYSTEM INFORMATION
          ================================================== */}
      <div className="rounded-lg border bg-muted/20 p-4">
        <div className="grid gap-4 text-sm md:grid-cols-2">

          <div>
            <p className="text-xs text-muted-foreground">
              Last login
            </p>

            <p className="mt-1">
              {formatDateTime(editState.user.lastLoginAt)}
            </p>
          </div>

          <div>
            <p className="text-xs text-muted-foreground">
              Last seen
            </p>

            <p className="mt-1">
              {formatDateTime(editState.user.lastSeenAt)}
            </p>
          </div>

        </div>
      </div>

      {/* ==================================================
          ACTIONS
          ================================================== */}
      <div className="flex items-center justify-end gap-2 border-t pt-4">

        <Button
          type="button"
          variant="outline"
          onClick={closeEdit}
          disabled={isSaving}
        >
          Cancel
        </Button>

        <Button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save changes
            </>
          )}
        </Button>

      </div>

    </div>
  )}
</Modal>

      {/* ======================================================
          USER ACTIVITY DIALOG
          ====================================================== */}
      <Modal
        open={Boolean(activityUser)}
        onClose={() => {
          if (!isActivityLoading) {
            setActivityUser(null)
            setActivity([])
          }
        }}
        title="User activity"
        description={
          activityUser
            ? `Recent activity for ${
                activityUser.name || activityUser.email
              }.`
            : undefined
        }
      >
        {activityUser && (
          <div className="space-y-4">
            {isActivityLoading ? (
              <LoadingState />
            ) : activity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="No activity records were returned for this user."
              />
            ) : (
              <div className="divide-y rounded-lg border">
                {activity.map((event, index) => (
                  <ActivityRow
                    key={
                      event.id ||
                      `${event.createdAt || 'event'}-${index}`
                    }
                    event={event}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ============================================================
// PART 05 END
//
// Next section in the SAME FILE:
// PART 06 - Shared visual components and helpers
// ============================================================
// ============================================================
// PART 06 - SHARED VISUAL COMPONENTS & HELPERS
//
// This section contains:
// - Summary cards
// - Activity rows
// - Filter controls
// - Select fields
// - Form fields
// - Modal shell
// - Loading state
// - Empty state
//
// FUTURE UPDATE GUIDE:
// Changes to reusable visual elements used only by the Users
// domain should start here.
//
// IMPORTANT:
// These are intentionally local Users-page components.
// If the same pattern is later proven to be needed by multiple
// unrelated domains, it can then be promoted to shared UI.
// ============================================================

// ------------------------------------------------------------
// Summary card
// ------------------------------------------------------------
function SummaryCard({
  label,
  value,
  description,
}: {
  label: string
  value: React.ReactNode
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

// ------------------------------------------------------------
// Activity row
//
// The backend may evolve the exact audit-event shape over time.
// Keep the presentation defensive so the Users page does not
// break simply because an optional activity field is absent.
// ------------------------------------------------------------
function ActivityRow({
  event,
}: {
  event: AuditEvent
}) {
const eventLabel = event.action || 'Activity'

const eventDescription =
  event.description || event.action || 'User activity recorded.'

  return (
    <div className="flex gap-3 p-4">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">
            {formatRole(String(eventLabel))}
          </div>

          <div className="text-xs text-muted-foreground">
            {formatDateTime(event.createdAt)}
          </div>
        </div>

        <div className="mt-1 text-sm text-muted-foreground">
          {eventDescription}
        </div>

        {event.ipAddress ? (
          <div className="mt-2 text-xs text-muted-foreground">
            IP: {event.ipAddress}
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Filter select
//
// Used by the page-level role and status filters.
// ------------------------------------------------------------
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
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
    >
      <option value="">{placeholder}</option>

      {options.map((option) => (
        <option key={option} value={option}>
          {formatRole(option)}
        </option>
      ))}
    </select>
  )
}

// ------------------------------------------------------------
// Form select field
//
// Used by the edit dialog for role and status.
// ------------------------------------------------------------
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
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {formatRole(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

// ------------------------------------------------------------
// Generic form field wrapper
// ------------------------------------------------------------
function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label}
        {required ? (
          <span className="ml-1 text-destructive">*</span>
        ) : null}
      </span>

      {children}
    </label>
  )
}

// ------------------------------------------------------------
// Local modal shell
//
// This keeps the Users page dialogs visually consistent without
// introducing a new global modal architecture.
// ------------------------------------------------------------
function Modal({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
}) {
  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border bg-background shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">
              {title}
            </h2>

            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Loading state
// ------------------------------------------------------------
function LoadingState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading users...
      </div>
    </div>
  )
}

// ------------------------------------------------------------
// Empty state
// ------------------------------------------------------------
function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Users className="h-5 w-5 text-muted-foreground" />
      </div>

      <h3 className="mt-4 text-sm font-semibold">
        {title}
      </h3>

      <p className="mt-1 max-w-md text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  )
}

// ============================================================
// PART 06 END
//
// USERS PAGE FILE END
//
// The complete UsersPage.tsx is now divided into six logical
// sections:
//
// PART 01 - Imports, constants, formatters & shared types
// PART 02 - Page state & selection management
// PART 03 - Loading, filtering, bulk delete & creation
// PART 04 - Individual & multi-user edit workflow
// PART 05 - Main page presentation / JSX
// PART 06 - Local visual components & helpers
//
// FUTURE TARGETED UPDATES:
// Use the part number and section name when making changes.
// Avoid rewriting unrelated sections.
// ============================================================