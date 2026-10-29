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
  ShieldCheck,
  X,
} from 'lucide-react'

import type {
  AdminUser,
  AuditEvent,
  UserRelationshipHistory,
  UserAccessMatrix,
} from '@/lib/api'

type UserActivityDialogProps = {
  user: AdminUser | null
  activity: AuditEvent[]
  relationships: UserRelationshipHistory[]
  isLoading: boolean
  accessMatrixEnabled: boolean
  accessMatrix: UserAccessMatrix | null
  accessMatrixLoading: boolean
  onLoadAccessMatrix: () => void
  onClose: () => void
  formatRole: (value: string) => string
  formatDateTime: (
    value?: string | null,
  ) => string
}

export function UserActivityDialog({
  user,
  activity,
  relationships,
  isLoading,
  accessMatrixEnabled,
  accessMatrix,
  accessMatrixLoading,
  onLoadAccessMatrix,
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
      ) : (
        <>
          <RelationshipHistorySection relationships={relationships} formatDateTime={formatDateTime} />
          {accessMatrixEnabled && (
            <section className="mb-5 rounded-lg border p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">User Access Matrix</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Configured module, resource, action and scope grants for {user.name || user.email}.</p>
                </div>
                <button type="button" onClick={onLoadAccessMatrix} disabled={accessMatrixLoading} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-medium disabled:opacity-50">
                  <ShieldCheck className="size-4" /> {accessMatrixLoading ? 'Loading…' : accessMatrix ? 'Refresh matrix' : 'Show access matrix'}
                </button>
              </div>
              {accessMatrixLoading && <div className="mt-3 text-sm text-muted-foreground">Loading permission grants…</div>}
              {accessMatrix && (
                <>
                  <p className="mt-3 rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">{accessMatrix.note}</p>
                  <div className="mt-3 max-h-[420px] overflow-auto rounded-md border">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="sticky top-0 bg-muted">
                        <tr><th className="p-2">Module</th><th className="p-2">Resource</th><th className="p-2">Action</th><th className="p-2">Scope</th><th className="p-2">Role grant</th><th className="p-2">User grant</th></tr>
                      </thead>
                      <tbody className="divide-y">
                        {accessMatrix.permissions.map((permission, index) => (
                          <tr key={permission.module + ':' + permission.resource + ':' + permission.action + ':' + permission.scope + ':' + index}>
                            <td className="p-2 font-medium">{permission.module}</td>
                            <td className="p-2">{permission.resource || permission.section || 'Module-level'}</td>
                            <td className="p-2">{permission.action}</td>
                            <td className="p-2">{permission.scope}</td>
                            <td className="p-2"><span className={permission.roleGranted ? 'rounded bg-emerald-100 px-2 py-1 text-emerald-800' : 'rounded bg-muted px-2 py-1'}>{permission.roleGranted ? 'Granted' : 'Not granted'}</span></td>
                            <td className="p-2">{permission.userGrants.length ? permission.userGrants.map((grant, i) => <span key={grant.effect + grant.subjectType + i} className="mr-1 rounded bg-blue-100 px-2 py-1 text-blue-800">{grant.effect}</span>) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">Generated {new Date(accessMatrix.generatedAt).toLocaleString()}. Green means a role grant exists; it is not a promise that every request succeeds.</p>
                </>
              )}
            </section>
          )}
          {activity.length === 0 ? (
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
        </>
      )}
    </Modal>
  )
}


function RelationshipHistorySection({
  relationships,
  formatDateTime,
}: {
  relationships: UserRelationshipHistory[]
  formatDateTime: (value?: string | null) => string
}) {
  return (
    <section className="mb-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Resource relationships</h3>
          <p className="mt-1 text-xs text-muted-foreground">Temporal ownership, custody, lease and other resource relationships.</p>
        </div>
        <span className="text-xs text-muted-foreground">{relationships.length} record{relationships.length === 1 ? '' : 's'}</span>
      </div>
      {relationships.length === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No resource relationships recorded for this user.</div>
      ) : (
        <div className="divide-y rounded-lg border">
          {relationships.map((item) => (
            <div key={item.id} className="p-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium">{formatEnum(item.relationshipType)} · {item.resourceType}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(item.validFrom)}</div>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Resource: {item.resourceId} · Status: {formatEnum(item.status)}</div>
              <div className="mt-1 text-xs text-muted-foreground">{item.endedAt ? 'Ended: ' + formatDateTime(item.endedAt) : item.validUntil ? 'Valid until: ' + formatDateTime(item.validUntil) : 'No scheduled end'}</div>
              {item.endedReason ? <div className="mt-1 text-xs text-muted-foreground">Reason: {item.endedReason}</div> : null}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function formatEnum(value?: string) {
  if (!value) return '—'
  return value.toLowerCase().split('_').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
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