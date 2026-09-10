// ============================================================
// USER EDIT DIALOG
// File: src/pages/admin/users/UserEditDialog.tsx
//
// PRESENTATION ONLY
//
// Responsibilities:
// - Display editable user fields
// - Display multi-user navigation
// - Display password validation feedback
// - Display Super Admin/current-user warnings
//
// API calls and save business logic remain in UsersPage.
// ============================================================
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  ShieldAlert,
  X,
} from 'lucide-react'

//import type { AdminUser } from '@/lib/api'
import type { EditState } from './UsersPage'

import { Button } from '@/components/ui/button'

type UserEditDialogProps = {
  editState: EditState
  isSaving: boolean
  editPasswordError: string
  isMultiUserEdit: boolean
  editSelectionIndex: number
  selectedUserCount: number
  isEditingCurrentUser: boolean
  roles: string[]
  statuses: string[]
  onClose: () => void
  onSave: () => void
  onPrevious: () => void
  onNext: () => void
  onChange: (
    updater:
      | EditState
      | ((
          current: EditState,
        ) => EditState),
  ) => void
  formatDate: (
    value: string | null,
  ) => string
  formatDateTime: (
    value?: string | null,
  ) => string
}

// ============================================================
// USER EDIT DIALOG
// ============================================================

export function UserEditDialog({
  editState,
  isSaving,
  editPasswordError,
  isMultiUserEdit,
  editSelectionIndex,
  selectedUserCount,
  isEditingCurrentUser,
  roles,
  statuses,
  onClose,
  onSave,
  onPrevious,
  onNext,
  onChange,
  formatDate,
  formatDateTime,
}: UserEditDialogProps) {
  if (!editState) {
    return null
  }

  return (
    <Modal
      open={Boolean(editState)}
      onClose={onClose}
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
      <div className="space-y-6">
        {/* ==================================================
            MULTI-USER NAVIGATION
            ================================================== */}

        {isMultiUserEdit ? (
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
            <div>
              <p className="text-sm font-medium">
                User{' '}
                {editSelectionIndex + 1}{' '}
                of {selectedUserCount}
              </p>

              <p className="text-xs text-muted-foreground">
                Save this user before moving to
                the next one.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPrevious}
                disabled={
                  editSelectionIndex <=
                    0 ||
                  isSaving
                }
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onNext}
                disabled={
                  editSelectionIndex >=
                    selectedUserCount - 1 ||
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
                {formatDate(
                  editState.user.createdAt,
                )}
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
                Be careful when changing your own
                role or account status. Backend
                security rules remain the final
                authority.
              </p>
            </div>
          </div>
        ) : null}

        {/* ==================================================
            BASIC INFORMATION
            ================================================== */}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">
              Basic information
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Update the user's primary identity
              and contact details.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Name"
              required
            >
              <input
                type="text"
                value={editState.name}
                onChange={(event) =>
                  updateField(
                    onChange,
                    'name',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={editState.email}
                onChange={(event) =>
                  updateField(
                    onChange,
                    'email',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Mobile">
              <input
                type="tel"
                value={editState.mobile}
                onChange={(event) =>
                  updateField(
                    onChange,
                    'mobile',
                    event.target.value,
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="New password">
              <input
                type="password"
                value={editState.password}
                onChange={(event) =>
                  updateField(
                    onChange,
                    'password',
                    event.target.value,
                  )
                }
                placeholder="Leave blank to keep current password"
                autoComplete="new-password"
                className={inputClass}
              />

              {editPasswordError ? (
                <p className="text-xs font-medium text-red-600">
                  {editPasswordError}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Enter a password only if you
                  want to set a new one.
                </p>
              )}
            </Field>
          </div>
        </div>

        {/* ==================================================
            ACCESS AND ACCOUNT
            ================================================== */}

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold">
              Access and account
            </h3>

            <p className="mt-1 text-xs text-muted-foreground">
              Manage the user's role and account
              lifecycle state.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              label="Role"
              value={editState.role}
              onChange={(value) =>
                updateField(
                  onChange,
                  'role',
                  value,
                )
              }
              options={roles}
            />

            <SelectField
              label="Status"
              value={editState.status}
              onChange={(value) =>
                updateField(
                  onChange,
                  'status',
                  value,
                )
              }
              options={statuses}
            />
          </div>

          {editState.user.role ===
            'SUPER_ADMIN' ||
          editState.role ===
            'SUPER_ADMIN' ? (
            <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />

              <div>
                <p className="text-sm font-medium">
                  Super Admin protection
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Changes affecting Super Admin
                  access are protected by backend
                  authorization and last-Super-Admin
                  safeguards.
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
              Configure language and preferred
              interaction method.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Preferred language">
              <input
                type="text"
                value={
                  editState.preferredLanguage
                }
                onChange={(event) =>
                  updateField(
                    onChange,
                    'preferredLanguage',
                    event.target.value,
                  )
                }
                placeholder="e.g. en"
                className={inputClass}
              />
            </Field>

            <SelectField
              label="Preferred input method"
              value={
                editState.preferredInputMethod
              }
              onChange={(value) =>
                updateField(
                  onChange,
                  'preferredInputMethod',
                  value,
                )
              }
              options={[
                'VOICE',
                'TEXT',
                'MIXED',
              ]}
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
              Manage profile completion and
              verification state.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Profile completion">
              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={
                  editState.profileCompletion
                }
                onChange={(event) =>
                  updateField(
                    onChange,
                    'profileCompletion',
                    event.target.value,
                  )
                }
                className={inputClass}
              />

              <p className="text-xs text-muted-foreground">
                Enter a value from 0 to 100.
              </p>
            </Field>

            <label className="flex items-center gap-3 rounded-md border px-3 py-2">
              <input
                type="checkbox"
                checked={
                  editState.isVerified
                }
                onChange={(event) =>
                  updateField(
                    onChange,
                    'isVerified',
                    event.target.checked,
                  )
                }
                className="h-4 w-4 rounded border"
              />

              <span>
                <span className="block text-sm font-medium">
                  Verified user
                </span>

                <span className="block text-xs text-muted-foreground">
                  Mark whether the user's account
                  is verified.
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
                {formatDateTime(
                  editState.user.lastLoginAt,
                )}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">
                Last seen
              </p>

              <p className="mt-1">
                {formatDateTime(
                  editState.user.lastSeenAt,
                )}
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
            onClick={onClose}
            disabled={isSaving}
          >
            Cancel
          </Button>

          <Button
            type="button"
            onClick={onSave}
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
    </Modal>
  )
}

// ============================================================
// FIELD
// ============================================================

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
          <span className="ml-1 text-destructive">
            *
          </span>
        ) : null}
      </span>

      {children}
    </label>
  )
}

// ============================================================
// SELECT FIELD
// ============================================================

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
        onChange={(event) =>
          onChange(event.target.value)
        }
        className={inputClass}
      >
        {options.map((option) => (
          <option
            key={option}
            value={option}
          >
            {formatRole(option)}
          </option>
        ))}
      </select>
    </label>
  )
}

// ============================================================
// FIELD UPDATE HELPER
// ============================================================

function updateField(
  onChange: UserEditDialogProps['onChange'],
  field: keyof NonNullable<EditState>,
  value: unknown,
) {
  onChange((current: EditState) => {
    if (!current) {
      return current
    }

    return {
      ...current,
      [field]: value,
    }
  })
}

// ============================================================
// LOCAL ROLE FORMATTER
// ============================================================

function formatRole(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map(
      (part) =>
        part.charAt(0).toUpperCase() +
        part.slice(1),
    )
    .join(' ')
}

// ============================================================
// INPUT CLASS
// ============================================================

const inputClass =
  'h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring'

// ============================================================
// LOCAL MODAL
// ============================================================

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
        if (
          event.target ===
          event.currentTarget
        ) {
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