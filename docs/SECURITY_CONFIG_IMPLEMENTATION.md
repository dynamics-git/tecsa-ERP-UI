# Security pages: config-only UI correction

Based on Purchase Requisition and the existing item-default-dimensions worksheet pattern.
Each page uses <app-list-page>, its TypeScript class, HTML, and config (plus optional FactBox config).
Related pages use runModalPageId and entry navigation; no custom modal, grid, form, permissionOperation or Core modifications.

Pages: Users; Permission Sets; Page Configuration; nested Company Access,
User Permission Sets, Sessions, Page Permissions, Resource Permissions,
Field and Action Permissions.

**Acceptance limitations:** backend shared security endpoints require company-prefixed aliases for the existing RestService.
Existing bulk-only permission endpoints also need row-level APIs for editable worksheet rows.
Users cannot be created through the current shared Form field types because password type is not implemented; New is intentionally disabled, not replaced by an insecure custom form.
No custom field/button rights engine is provided. This is a strict architecture correction, **not feature completion**.
No migration or Core changes in the UI branch. Do not merge until backend integration, Angular build and tests pass.
