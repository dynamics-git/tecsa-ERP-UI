# UI-F1.3 / Purchase Order acceptance (local Angular, existing Laravel API)

## Scope
This is the first **live schema-driven List + Header + Lines** reference page, not a copy
of the old Business Central mock. Source files:
- `purchase-order-erp.config.ts`: current Laravel fields, endpoints, commands
- `purchase-order.config.ts`: preserved legacy visual/config reference
- `list-page`, `document-window`, `document-lines`, `run-modal`: shared UI

## First smoke test (safe/read-only)
1. Run `npm run build` locally. No Hostinger deployment is necessary.
2. Log in with a user who has `purchase_orders,read` in the active company.
3. Under **Purchase > Documents**, open **Purchase Orders**. It is now visible
   only with appropriate page permissions.
4. Verify List columns, search, status views, filters, row selection, export,
   saved view/column personalization, refresh and FactBox.
5. Open a **previously existing** order: its number, vendor, source PR and status
   must match the Laravel record. Verify the **Lines** grid shows lineNo,
   item/G-L details, quantity, costs, amounts, received/outstanding and PR line.
6. Open/close another RunModal page; the PO must retain its unsaved state.
7. No **New PO**, **Delete PO**, **New Line** or **Delete Line** button may be
   active: Laravel currently creates orders only by converting approved PRs.
8. If there are no POs in the selected company, the empty list is expected.
   PR-to-PO conversion UI is the next connected workflow required to create one.

## Mutating test (only on designated test documents, not live trade data)
1. On an `open` PO, edit **Vendor Document No.**, then check persistence
   and refresh. Only this header field is accepted by the current API.
2. On an `open` PO line, edit description, quantity, cost or required date.
   Refresh and verify backend values; do not use the UI to recalculate or
   invent posted amounts.
3. Verify a `released` or `cancelled` order is not editable.
4. **Release / Reopen / Cancel** call actual Laravel actions with status
   guards; only test these on expressly designated test records.
5. Verify unauthorized and stale-version errors do not silently succeed.

## Not yet accepted
- Approved-PR **Convert to Purchase Order** workflow (required for creating POs)
- PO status-history surface, provenance drilldowns and integrated full browser QA
- High-scale performance and accessibility signoff

No migrations, backend files or hosting workflow were changed for this step.
