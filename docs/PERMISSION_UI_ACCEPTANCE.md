# Permission Administration UI (backend PR #25)

This feature branch adds Administration > Security:
- Permission Sets (existing shared ListPage/Header) and Page/Control/Resource editor
- ERP Users (existing shared ListPage/Header) with protected creation form
- Page Configuration (automatic discovery from runModalPageModules)
- User Company/Role assignments and Active Sessions with explicit revoke confirmation

The UI uses existing TecSA design tokens, not HLB components. HLB Portal 17.0
is the workflow reference. The PR List/Header configuration pattern is retained.

Deployment order:
1. Backend feature branch (PR #25) and its incremental migration, including the
   new protected Users directory/membership APIs and GET permissionResources.
2. Frontend feature branch with the matching permission pages.
3. Login as a user allowed to administer security (SUPER or explicitly authorized).
4. Administration > Page Configuration > Synchronize UI Configuration.
   Unknown resource mappings are shown and skipped, not silently trusted.
5. Administration > Permission Sets > select a role > Page/Resource Permissions.
   Save resource + page grants; field/button override checkboxes are UI-only.
6. Administration > ERP Users > select a user > Company/Role Access,
   or Create User then assign Company and Role; inspect/revoke sessions.

Security boundaries:
- Role UI checks do not override backend resource permission middleware.
- UI field/button restrictions are presentation safeguards; API routes remain
  authoritative for create/modify/delete/execute, not target-key-specific.
- A role can be assigned to all member companies (companyId=null), but it
  cannot create company membership by itself.
- Active session is defined by a valid token, not live websocket presence.
- Catalog sync only affects a Page after explicit page-rights are configured;
  never copy its tables per company in this phase.
- No Platform or company provisioning/schema-copying changes.
- Workflow commands requiring **per-command backend security** (e.g. Submit,
  Approve and Post) need explicit operation policy coverage before accepting
  per-button checkboxes as a security enforcement boundary.

Acceptance requires: npm ci, Angular build, frontend tests, backend migration
and full PermissionFoundationTest + PermissionCatalogAndSessionsTest, then
manual desktop/browser UI verification. No merge until checked.
