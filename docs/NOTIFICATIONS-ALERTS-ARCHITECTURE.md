# Notifications & Alerts Architecture


## Notifications & Alerts module (in-app event governance)
- Notifications are persisted in-app events scoped to the authenticated user. The API supports bounded listing, type/severity/unread filters, unread count, mark-one-read and mark-all-read. Every list/count/update query includes the authenticated user ID.
- Severity is INFO, SUCCESS, WARNING or CRITICAL. Events include their producing module, a stable per-user deduplication key and a logical expiry timestamp. The default retention window is 180 days; expired alerts are hidden, not hard-deleted.
- A shared transaction-safe writer is used by Inventory low-stock events, Marketplace order/delivery/counter-offer events and Livestock follow-up scheduling. A compound unique key plus createMany(skipDuplicates) prevents duplicate event rows without aborting the originating transaction.
- Registry definitions cover notification fields and list filters. Query limits are bounded to 1–100. Links are restricted to internal /app/ routes; external or unsafe hrefs are suppressed.
- The browser UI exposes severity, event type and unread-only filters, severity styling, refresh, per-item read and mark-all-read. When unread-only is active, read items disappear from the visible list immediately.
- External SMS/email/push delivery is intentionally separate from persisted in-app notifications and remains a plug-in integration. Notifications do not hard-delete history.

## Event flow
1. A business operation completes its domain checks and writes the domain event inside its existing transaction.
2. The shared NotificationsService writer creates an event in the same transaction with severity, source, internal href, stable dedupe key and expiry. Duplicate keys are skipped safely.
3. The authenticated inbox queries only the current user’s active notifications, applies Registry-validated filters and returns newest-first results with a bounded page size.
4. Read/unread updates are scoped by both notification ID and authenticated user. Expired records are not returned or counted.
5. The UI refreshes the inbox and unread count, and filters severity, event type or unread state without changing domain data.

## Data and migration
- Additive fields: severity, source, dedupeKey and expiresAt. Existing notifications receive an expiry based on createdAt plus 180 days.
- Unique constraint: userId + dedupeKey. Nullable keys remain available for legacy/non-event rows.
- Indexes support user read-state listing and expiry filtering. No notification rows are physically deleted.
- The pre-migration database backup is stored in the configured recovery folder. The database also contains a pre-existing rolled-back duplicate God Mode migration record whose checksum matches the already-applied migration; this history warning is documented and not silently deleted.
