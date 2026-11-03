# Choose a page type

Page type chooses how shared ListPage opens and hosts the page. It does not define a second API style, a new storage model or permission bypass.

## Supported page types

| pageType | Entry behavior | Typical purpose |
| --- | --- | --- |
| list | Browse the collection | A list-oriented surface with configured columns/actions |
| card | Browse, then open one record | Users and ordinary masters |
| document | Browse, then open a header with lines | Purchase Requisition |
| worksheet | Open the entry/grid surface directly | Related permission rows, entry sheets, read-only ledgers |
| setup | Open the setup entry directly | A configured singleton or setup record |

`pageType` alone does not make a source singleton, read-only or editable. Declare the data-source capability and supply the appropriate header/line config.

## Card

```typescript
pageType: 'card',
dataSource: {endpoint: '/users', keyField: 'systemId'},
```

The list config describes browse columns. Header config describes the record form. A card may have related lines; Users has permission-set assignments below its header. “Card” does not forbid lines.

## Document

```typescript
pageType: 'document',
dataSource: {endpoint: '/purchaseRequisitions', keyField: 'systemId'},
```

Provide its LineConfig separately. Header and line data sources identify their own records, and the business relation binds them. Page-specific domain actions such as Submit are custom commands; they are not generic Save commands.

## Worksheet

Page Permissions is a related worksheet. It receives the selected permission-set business key and edits its page-rule records. It reuses the shared line editor rather than a custom permission grid.

```typescript
const source = {
  endpoint: '/pagePermissions',
  keyField: 'systemId',
  headerPKProp: 'code',
  lineFKProp: 'permissionSetCode',
};
// ListPageConfig
pageType: 'worksheet',
dataSource: source,
// LineConfig uses the same source and declares its columns.
```

If a worksheet has no visible header fields, `sections: []` is intentional. An empty header does not require a second layout implementation. Its row fields still come from the LineConfig columns.

## Posted or read-only worksheet

```typescript
dataSource: {
  endpoint: '/postedEntries',
  keyField: 'systemId',
  supportsCreate: false,
  supportsUpdate: false,
  supportsDelete: false,
}
```

This is an illustrative source name, not a claim that a `postedEntries` API exists. The real posted table must expose read-only operations on the server too. Set the corresponding LineConfig `editable: false` when using a line surface. Core retains its consistent grid structure; non-entry visual rows need not masquerade as editable controls.

## Setup

```typescript
pageType: 'setup',
dataSource: {endpoint: '/mySetup', keyField: 'systemId', singleton: true},
```

The endpoint is illustrative. Use `singleton` only when that API actually implements a singleton contract. Do not select an arbitrary first record from a multi-record table to simulate singleton behavior.

## Exceptions that are independent of page type

FactBox visibility, read-only states, custom commands, field validation, relationships, number series, saved views and authorization each have their own supported config. Do not invent a new page type for every combination. The generated [page contract](/documentation/reference/page-config) lists all available properties.
