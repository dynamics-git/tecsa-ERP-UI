# Create a consistent page

Use the same feature-folder pattern as Users and Purchase Requisition. Start from an existing reference page and change its business fields, rather than rebuilding editors, save handling or navigation.

## Installed API alignment — 13 November 2026

Master and setup configs now use the installed table/API field names, integer
enum ordinals, decimal precision and business-code references. For example,
posting setup stores `genBusPostingGroup`/`genProdPostingGroup`, setup number
series store codes from `/noSeries`, and Vendors uses `vendorPostingGroup`,
`vatRegistrationNo`, `postCode` and `eMail`. Existing UUID reference columns
such as Vendor `paymentTermsId` remain UUIDs where the actual API declares them.
Do not mechanically turn every relationship into either a UUID or a code.

Unsupported legacy fields, including `isActive` on tables without that column,
are removed from editors, list columns and FactBoxes. Descriptions and names
are not blanket create prerequisites. Keep an explicit prerequisite when the
API requires it or a manual business key must exist before creating children.
Backend constraints and authentication rules remain authoritative.

Related worksheets use ordinary collection endpoints: `/dimensionValues`,
`/dimensionValueCombinations`, `/currencyExchangeRates`, `/itemUnitsOfMeasure`,
`/defaultDimensions` and `/defaultDimensionPriorities`. Declare business parent
bindings with `headerPKProp`, `lineFKProp`, `parentFieldMap` and, when needed,
`parentFixedFields`. Dimension combinations bind both dimension codes; default
dimensions also constrain `tableId` to the actual backend Table object identity.
These are stored business fields, not an additional frontend source registry.

RunModal explicitly maps the header or selected line's business values. A
Dimension card receives `code: dimensionCode`, not a code labelled `systemId`.
The shared card probe resolves exactly one API record before opening it.

Purchase Order now follows the same ordinary CRUD pattern as PR, using
`/purchaseHeaders` and `/purchaseLines`. Its fixed Order scope is integer
`documentType: 1`; Lines bind both `documentType` and `documentNumber`. Its
header has no published number allocator, so enter a manual No. before create.
Existing backend line numbering remains in use. Placeholder posting, approval
and release buttons have been removed; those processes remain separate work.
Balancing Account No. on Payment Methods is one code field for the selected
account type; a conditional account picker is not introduced in this correction.

Notification Setup retains its existing coherent Save behavior: its backend
policy validates event/template tokens and recipient mode with its selected
recipient together. It is an existing business configuration exception, not an
alternative ordinary master CRUD pattern. No notification policy is changed here.

## Four CRUD references — 7 November 2026

Use these four existing features as the current configuration examples:

| Page type | Feature folder | Authoring contract |
| --- | --- | --- |
| Document and its List | `purchasing/purchase-requisition` | Header `number` maps to line `documentNumber`; `documentType` is also mapped. Each record still uses its own `systemId`. |
| Card and its List | `purchase-masters/payment-terms` | `code`, description and payment-term settings. The persisted credit-memo setting is `calcPmtDiscOnCrMemos`; this table has no `isActive` field. |
| Setup | `purchase-masters/source-code-setup` | Company singleton, edited through PUT. Source settings store codes, not GUIDs. New/Delete commands are disabled. |
| Worksheet | `administration/user-company-access` | User context supplies `userName`; rows store `companyCode`, `isDefault` and `isActive`. No Header editor is needed. |

Each feature keeps the same four production files: `.html`, `.ts`, `.config.ts`
and `.factbox.config.ts`. Keep configuration expanded and ordered **Header, List,
then Line when applicable**. In fields, use key/id, label, editor type, optional
value semantics/default, lookup, then presentation overrides. Keep the TypeScript
wrapper and HTML shared-component bindings in the same order across features.
Do not introduce a config factory or a different page engine for one page type.
The FactBox file may explicitly disable the panel for a worksheet; do not add an
unused Header or Line config just to make the files look alike.

`listColumns(headerConfig, ...)` reuses Header labels/types for the selected list
columns. A lookup remains an explicit Page choice: it can select a different
source or scope on another page. `valueField: 'code'` (or `'number'`) stores the
business value; `recordRead: 'collection'` resolves that selected value through
a filtered collection instead of treating the code as a UUID record route.
`valueType: 'code'` describes lookup value semantics while `type: 'lookup'`
selects its editor. Those two declarations serve different purposes.

PR's Item and G/L choices are two conditional editors over the same persisted
`number` field, using separate column IDs and `field: 'number'`. They are not two
stored master-ID columns. Existing FactBox sections, menu, actions and calculation
declarations are retained. Approval/conversion/posting actions remain deferred;
their presence in configuration is not a claim that those backend commands work.

PR accepts either a manual No. or its configured backend number-series path.
Its conditional No. prerequisite is separate from subsequent field PATCHes.
The existing backend Enum supplies `documentTypeLabel` in record responses;
an unsaved editor has no server-generated caption until its record is created.
Do not substitute a frontend document-type constant or dictionary.

The four references declare UI editor types and any intentional UI validation.
PostgreSQL-derived backend validation remains authoritative. Object IDs are
optional metadata; these pages keep explicit API sources and UI relationships.
No retired capability metadata endpoint is required by this pattern.

## Files in the feature folder

```text
features/administration/samples/
  samples.ts
  samples.html
  samples.config.ts
  samples.factbox.config.ts
```

The feature-folder discovery script finds page/config pairs. The shared registry derives pages and routes from these modules. Do not add another manual page import list for RunModal.

## Page config

The import below assumes the same folder depth as Users. Use the platform public API; feature code must not import private editor/runtime internals.

```typescript
import {
  DataSourceConfig, HeaderConfig, ListPageConfig, listColumns,
} from '../../../platform/public-api';
import {samplesFactBoxConfig} from './samples.factbox.config';

export const samplesHeaderConfig: HeaderConfig = {
  dialogTitle: 'Sample',
  toolbarButtons: [],
  sections: [{
    id: 'general',
    title: 'General',
    fields: [
      {key: 'code', label: 'Code', type: 'text', required: true, validation: {maxLength: 30}},
      {key: 'description', label: 'Description', type: 'text', required: true, validation: {maxLength: 150}},
      {key: 'isActive', label: 'Active', type: 'boolean', defaultValue: true},
      {key: 'startingDate', label: 'Starting Date', type: 'date'},
    ],
  }],
};

export const samplesListConfig: ListPageConfig & {dataSource: DataSourceConfig} = {
  pageId: 'samples',
  pageType: 'card',
  title: 'Samples',
  dataSource: {
    endpoint: '/samples',
    keyField: 'systemId',
    defaultSort: 'code asc',
    pageSize: 25,
  },
  identity: {primaryField: 'code', secondaryField: 'description'},
  module: 'Administration',
  menu: {
    module: 'Administration', group: 'Setup',
    icon: 'ts-icon ts-icon-panel',
    moduleIcon: 'ts-icon ts-icon-administration-module',
    route: '/samples',
  },
  dataSurface: {columns: listColumns(samplesHeaderConfig, [
    {field: 'code'}, {field: 'description'}, {field: 'isActive'}, {field: 'startingDate'},
  ])},
  factBox: samplesFactBoxConfig,
};
```

This example is compact for reading. Keep production config expanded and consistently ordered as in the worked Users source. `listColumns` derives labels and types from the header fields; add column-only overrides only where needed.

## FactBox config

```typescript
import type {FactBoxConfig} from '../../../platform/public-api';

export const samplesFactBoxConfig: FactBoxConfig = {
  enabled: true,
  label: 'Sample information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  binding: {titleField: 'code', subtitleField: 'description'},
  sections: [],
};
```

## Page TS

```typescript
import {Component, Input} from '@angular/core';
import {ListPage, RunModalPageWindow} from '../../../platform/public-api';
import {samplesHeaderConfig, samplesListConfig} from './samples.config';
export * from './samples.config';

@Component({
  selector: 'app-samples',
  standalone: true,
  imports: [ListPage],
  templateUrl: './samples.html',
})
export class SamplesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = samplesListConfig;
  readonly headerConfig = samplesHeaderConfig;
}
```

## Page HTML

```html
<app-list-page
  [listConfig]="listConfig"
  [headerConfig]="headerConfig"
  [documentOnly]="!!runModal"
  [initialRecord]="runModal?.record"
  (closeRequested)="runModal?.close()"
></app-list-page>
```

## What you did not have to write

Standard New/Delete/Refresh, HTTP save handlers, filtering controls, sorting controls, record ID routing, grid resize/reorder logic and modal infrastructure stay in core. Ordinary pages omit `autoSave: true` and omit a manual Save command.

Give custom commands stable keys and existing icons. Do not use arbitrary CSS gaps or new grid markup to mimic the standard page. See [page types](/documentation/frontend/page-types) before choosing a different entry surface.
