# Reports & Analytics Architecture


## Reports & Analytics module (implemented backend workflow)
- The Reports screen reads a single authenticated backend overview endpoint instead of independently aggregating six client-side API calls. The API composes existing farm, crop, livestock, inventory, finance, and current-user Marketplace services; it does not write or mutate domain records.
- Farm filtering is checked against the farms returned for the authenticated user. Unknown or foreign farm identifiers are not disclosed. Inclusive from/to date filters are checked by the central Registry, must be real calendar dates, and reject reversed ranges.
- The Registry defines the reports module, farmReport resource, and reusable farm/date filter fields. The API uses existing module service authorization, returns an as-of timestamp, and reports optional-source failures as warnings while preserving other authorized sections. If farm access cannot be verified for a requested farm filter, the report fails closed.
- Farm summaries include crop and livestock counts, inventory counts and reorder-level alerts, and recorded income/expense/net by currency. Currency totals are never added across currencies and no exchange rate is invented. Marketplace counts are limited to the current seller and are not falsely attributed to a farm.
- CSV export includes farm summaries, filtered financial detail, the generation timestamp, filters, and data-scope notes. Reports are read-only and are not bank balances, audited accounts, tax advice, or statutory filings.

## Request flow
1. Authenticated user submits optional farm, from-date and to-date filters.
2. DTO shape validation and Registry field validation reject malformed inputs. Calendar dates and range order are validated before aggregation.
3. Existing authorized module services provide each data source; farm ownership is verified before a farm-specific result is returned.
4. The service calculates read-only counts, low-stock alerts and financial totals grouped by currency. A failed optional source produces a warning; a failed farm-ownership check fails closed.
5. The response includes generatedAt, filters, available farm choices, summaries, financial details, source warnings and data limitations. The UI can export the authorized response as CSV.

## Safety and limitations
- No direct database writes, state transitions, or inventory/finance mutations occur in reporting.
- Financial totals are recorded entries, not bank balances or audited financial statements. Currency conversion is not performed.
- Marketplace listing totals are seller-wide because a listing is not assumed to belong to a farm unless the data model establishes that relationship.
- Permission failures do not return protected records. If the service cannot verify the selected farm, the filtered report is unavailable.
