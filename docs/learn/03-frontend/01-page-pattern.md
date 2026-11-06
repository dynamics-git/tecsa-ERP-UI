# Create a consistent page

Use the same feature-folder pattern as Users and Purchase Requisition. Start from an existing reference page and change its business fields, rather than rebuilding editors, save handling or navigation.

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

## Minimal Page Object projection

For a Page Object, source binding is resolved by shared Core. This minimal
projection of the existing PR demonstrates the declaration shape; it is not a
second registered page. The full PR config retains its existing commands and
UI behaviours.

```typescript
import { HeaderConfig, ObjectLineConfig, ObjectPageConfig, listColumns } from '../../../platform/public-api';

const header: HeaderConfig = {
  toolbarButtons: [],
  sections: [{id: 'general', title: 'General', fields: [
    {key: 'number', label: 'No.', readonlyAfterCreate: true},
    {key: 'purpose', label: 'Purpose', type: 'textarea'},
  ]}],
};

const lines: ObjectLineConfig = {
  placement: {mode: 'after-section', afterSectionId: 'general'},
  columns: [
    {id: 'description', label: 'Description'},
    {id: 'quantity', label: 'Quantity'},
  ],
};

const page: ObjectPageConfig = {
  objectId: 10000,
  pageId: 'purchase-requisition',
  pageType: 'document',
  title: 'Purchase Requisition',
  dataSurface: {columns: listColumns(header, ['number', 'purpose'])},
  factBox: {enabled: true, overview: true, notes: true, attachments: true},
};
```

The backend supplies source paths, UUID record addressing, composite parent
bindings and physical fields. UI declares only its layout and intentional
presentation overrides. See [field contracts](/documentation/core/field-contract-details).
