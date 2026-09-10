// ============================================================
// USER CREATE DIALOG
// File: src/pages/admin/users/UserCreateDialog.tsx
//
// PRESENTATION ONLY
//
// API submission remains in UsersPage.
// ============================================================
import type { FormEvent } from 'react'

import { Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'

type UserCreateDialogProps = {
  open: boolean
  onClose: () => void
  name: string
  email: string
  password: string
  isCreating: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export function UserCreateDialog({
  open,
  onClose,
  name,
  email,
  password,
  isCreating,
  onNameChange,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: UserCreateDialogProps) {
  if (!open) {
    return null
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create user"
      description="Create a new platform account."
    >
      <form
        onSubmit={onSubmit}
        className="space-y-5"
      >
        <Field label="Name" required>
          <input
            value={name}
            onChange={(event) =>
              onNameChange(
                event.target.value,
              )
            }
            placeholder="Enter full name"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Email" required>
          <input
            type="email"
            value={email}
            onChange={(event) =>
              onEmailChange(
                event.target.value,
              )
            }
            placeholder="name@example.com"
            required
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <Field label="Password" required>
          <input
            type="password"
            value={password}
            onChange={(event) =>
              onPasswordChange(
                event.target.value,
              )
            }
            placeholder="Enter temporary password"
            required
            minLength={8}
            autoComplete="new-password"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </Field>

        <div className="rounded-lg border bg-muted/30 p-4 text-sm">
          <div className="font-medium">
            Initial account settings
          </div>

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
            Role and status can be managed from the
            Edit action after the account is created.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={isCreating}
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            disabled={isCreating}
          >
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
  )
}

// ============================================================
// LOCAL FORM FIELD
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