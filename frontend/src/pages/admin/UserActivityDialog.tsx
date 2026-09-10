// ============================================================
// USER ACTIVITY DIALOG
// File: src/pages/admin/users/UserActivityDialog.tsx
//
// PRESENTATION ONLY
//
// Activity loading remains in UsersPage.
// ============================================================
import {
  Activity,
  Loader2,
  Users,
  X,
} from 'lucide-react'

import type {
  AdminUser,
  AuditEvent,
} from '@/lib/api'

type UserActivityDialogProps = {
  user: AdminUser | null
  activity: AuditEvent[]
  isLoading: boolean
  onClose: () => void
  formatRole: (value: string) => string
  formatDateTime: (
    value?: string | null,
  ) => string
}

export function UserActivityDialog({
  user,
  activity,
  isLoading,
  onClose,
  formatRole,
  formatDateTime,
}: UserActivityDialogProps) {
  if (!user) {
    return null
  }

  return (
    <Modal
      open={Boolean(user)}
      onClose={onClose}
      title="User activity"
      description={`Recent activity for ${
        user.name || user.email
      }.`}
    >
      {isLoading ? (
        <LoadingState />
      ) : activity.length === 0 ? (
        <EmptyState
          title="No recent activity"
          description="No activity records were returned for this user."
        />
      ) : (
        <div className="divide-y rounded-lg border">
          {activity.map(
            (event, index) => (
              <ActivityRow
                key={
                  event.id ||
                  `${
                    event.createdAt ||
                    'event'
                  }-${index}`
                }
                event={event}
                formatRole={formatRole}
                formatDateTime={
                  formatDateTime
                }
              />
            ),
          )}
        </div>
      )}
    </Modal>
  )
}

// ============================================================
// ACTIVITY ROW
// ============================================================

function ActivityRow({
  event,
  formatRole,
  formatDateTime,
}: {
  event: AuditEvent
  formatRole: (value: string) => string
  formatDateTime: (
    value?: string | null,
  ) => string
}) {
  const eventLabel =
    event.action || 'Activity'

  const eventDescription =
    event.description ||
    event.action ||
    'User activity recorded.'

  return (
    <div className="flex gap-3 p-4">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <Activity className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm font-medium">
            {formatRole(
              String(eventLabel),
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            {formatDateTime(
              event.createdAt,
            )}
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

// ============================================================
// LOADING STATE
// ============================================================

function LoadingState() {
  return (
    <div className="flex min-h-[220px] items-center justify-center p-8">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading activity...
      </div>
    </div>
  )
}

// ============================================================
// EMPTY STATE
// ============================================================

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