// ============================================================
// USERS TABLE
// File: src/pages/admin/users/UsersTable.tsx
//
// PRESENTATION ONLY
//
// Responsibilities:
// - Render user table
// - Selection controls
// - Row actions
//
// API calls and business logic remain in UsersPage.
// ============================================================

import {
  Activity,
  Loader2,
  Pencil,
  Users,
} from 'lucide-react'

import type { AdminUser } from '@/lib/api'
import { Button } from '@/components/ui/button'

type UsersTableProps = {
  users: AdminUser[]
  isLoading: boolean
  totalUsers: number
  selectedUserIds: string[]
  onToggleUser: (userId: string) => void
  onToggleAll: () => void
  onEdit: (user: AdminUser) => void
  onActivity: (user: AdminUser) => void
  formatRole: (value: string) => string
  formatDate: (value: string | null) => string
  formatDateTime: (
    value?: string | null,
  ) => string
  isRecentlyActive: (
    lastSeenAt: string | null,
  ) => boolean
  statusClass: (status: string) => string
}

// ============================================================
// USERS TABLE
// ============================================================

export function UsersTable({
  users,
  isLoading,
  totalUsers,
  selectedUserIds,
  onToggleUser,
  onToggleAll,
  onEdit,
  onActivity,
  formatRole,
  formatDate,
  formatDateTime,
  isRecentlyActive,
  statusClass,
}: UsersTableProps) {
  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex min-h-[220px] items-center justify-center p-8">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading users...
          </div>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>

          <h3 className="mt-4 text-sm font-semibold">
            No users found
          </h3>

          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            {totalUsers === 0
              ? 'There are no users available yet.'
              : 'Try changing your search or filters.'}
          </p>
        </div>
      </div>
    )
  }

  const allSelected =
    users.length > 0 &&
    users.every((user) =>
      selectedUserIds.includes(user.id),
    )

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
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
            {users.map((user) => {
              const isSelected =
                selectedUserIds.includes(
                  user.id,
                )

              const recentlyActive =
                isRecentlyActive(
                  user.lastSeenAt,
                )

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
                        onToggleUser(user.id)
                      }
                      aria-label={`Select ${
                        user.name ||
                        user.email
                      }`}
                      className="h-4 w-4 rounded border"
                    />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted font-medium">
                        {(
                          user.name ||
                          user.email ||
                          '?'
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {user.name ||
                            'Unnamed user'}
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
                      {formatRole(
                        user.status,
                      )}
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

                      <span className="text-xs font-medium">
                        {recentlyActive
                          ? 'Recently active'
                          : 'Not recently active'}
                      </span>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDateTime(
                      user.lastLoginAt,
                    )}
                  </td>

                  <td className="px-4 py-3 text-muted-foreground">
                    {formatDate(
                      user.createdAt,
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onActivity(user)
                        }
                      >
                        <Activity className="mr-2 h-4 w-4" />
                        Activity
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          onEdit(user)
                        }
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
    </div>
  )
}