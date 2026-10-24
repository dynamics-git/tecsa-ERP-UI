# Shared record FactBox

The existing ListPage and DocumentWindow compose the same app-fact-box. The host
owns the header, tabs, panel selection, width and configured action buttons.
Overview, Notes and Attachments are separate exported Angular components. No new
command dispatcher, popup service or component registry is introduced.

## Page configuration

Items is the reference: features/purchase-masters/items/items.factbox.config.ts.
Import it into the existing page config as factBox: itemsFactBoxConfig.

    const factBox: ListFactBoxConfig = {
      enabled: true,
      label: 'Item information',
      overview: true,
      notes: false,
      attachments: true,
      defaultSectionId: 'overview',
      sections: [
        {id: 'summary', title: 'Item overview', layout: 'metrics', fields: [
          {id: 'price', label: 'Unit price', field: 'unitPrice'}
        ]}
      ]
    };

Flags remove both the tab and its component. enabled: false removes the entire
FactBox. Omitted panel configuration uses the shared Overview/Notes/Files design.
Omitted sections retain existing automatic field fallback. collapsed: true keeps
secondary information in an accessible disclosure. Formatting/lookups reuse the
page fields/columns, including decimal strings and audit captions.

## Partner components and buttons

Use the foundation public API. A trusted Angular package passes its compiled
component directly in panels; no core registry edit or string-to-code loader:

    panels: [
      {id: 'overview', kind: 'overview', title: 'Overview'},
      {id: 'stock', title: 'Stock', component: PartnerStock, data: {caption: 'Availability'}},
      {id: 'notes', kind: 'notes', title: 'Notes'},
      {id: 'files', kind: 'attachments', title: 'Files'}
    ]

Custom parts accept context: FactBoxContext and data: Record<string, unknown>.
context contains the record, pageId, companyId, recordEndpoint and the existing
action callback. Panels can use enabled: false; built-in kind flags still apply.
Existing FactBoxSectionConfig also accepts customComponent with the same inputs;
its existing rows and buttons render alongside that component. The previous
customComponentKey string was an unimplemented placeholder; it is not a loader.

Global config.buttons, panel.buttons and section.buttons use existing CommandConfig.
They keep label/icon/hidden/disabled/tooltip/permissionKey/actionKey, and can use
existing runModalPageId/target/record mappings. Actions go through the existing
page dispatcher and RunModal resolver, with the selected saved List record or
current Card/worksheet context. Configurations never grant data permissions.
Notes and Files tabs mount lazily and remain mounted after first use, preserving
a note draft across tab switches. Drafts are kept separately per user/company/
workspace/record in the component, not in a global preview service or localStorage.
The normal document close button and route guard use existing unsaved-change
confirmation; browser unload is also guarded. Saving is always explicit. Hiding the FactBox or opening Filters preserves its mounted editors; confirmed discard clears drafts. Notes create/edit/delete and attachment metadata deletion use the existing DataSourceService; multipart uploads and binary downloads retain their transport adapter.

## Partner editor lifecycle

An editable custom panel or Overview component uses the existing public
UnsavedChangesService. Register on context/input changes and release on destroy:

    ngOnChanges() {
      this.unsaved.register(this, {
        changed: () => this.dirty,
        saving: () => this.saving,
        discard: () => this.discardDraft()
      }, this.context.unsavedScope);
    }
    ngOnDestroy() { this.unsaved.release(this); }

unsavedScope is an opaque host token; do not serialize it or replace it with a
page/record string. It isolates simultaneous FactBoxes. The scoped close check
includes registered partner editors; the existing global route guard continues
to see all registrations. A read-only component needs no registration.

Worksheet configured fields and automatic fallback use the selected saved row,
its column value types and lookup captions. Notes/Files use that same owner row.
List and Card apiAction commands reuse the existing action executor. They require
a saved record, execute permission and the configured allowed state; List actions
require one selected record and reload the list after success. Button config does
not create or authorize a backend business command.

## Real shared APIs

For trusted registered table APIs, Notes/Attachments are available under the exact
existing record path, including parent-child and workspace prefixes:

    GET/POST    /companies/{company}/items/{systemId}/notes
    PATCH/DELETE /companies/{company}/items/{systemId}/notes/{noteId}
    GET/POST    /companies/{company}/items/{systemId}/attachments
    DELETE      /companies/{company}/items/{systemId}/attachments/{attachmentId}
    GET         /companies/{company}/items/{systemId}/attachments/{attachmentId}/content

The existing registered-table runtime validates parent read access, company and
parent scope. Separate record_notes and record_attachments permission resources
control feature actions. SUPER follows existing server permission rules; no grants
are added automatically. Lists return server capabilities used by the components.
PATCH/DELETE require the current numeric If-Match ETag; stale writes fail with 412.
Lists are paged; both components expose previous/next and refresh/error states.
Files use private storage with generated paths and authenticated forced downloads.
No storage path or public file URL is returned. Limits are configured in the backend
record_collaboration config. Records created by custom business controllers need
an equivalent trusted registered read scope before these APIs can be used; no
arbitrary database table is exposed by enabling a frontend tab.

Install the additive 2026_10_24_000001_create_record_collaboration migration in each
workspace database being upgraded; do not modify existing business migrations.
Polymorphic collaboration is retained after owner deletion but cannot be read
without the parent record. It is not automatically cascaded through posting or
ERP deletion engines. File retention/cleanup must follow the installation policy.
