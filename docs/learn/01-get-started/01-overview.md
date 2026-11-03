# Build with TecSA shared core

Start with a table and its API, then describe its Angular page with configuration. Shared core handles ordinary record work. Business rules extend that flow through the supported hooks.

## Choose your learning path

| Goal | Start here | Result |
| --- | --- | --- |
| Add an ordinary four-field table | [Table and API](/documentation/backend/table-and-api) | Migration, Model and API Controller |
| Build a visible page | [The page pattern](/documentation/frontend/page-pattern) | A consistent feature folder using shared UI |
| Connect a header to its lines | [Business relationships](/documentation/backend/business-relationships) and [header and lines](/documentation/frontend/header-and-lines) | Matching database keys and UI filters |
| Add validation or actions | [Validation](/documentation/core/fields-and-validation) and [commands](/documentation/core/commands-and-runmodal) | Rules in the right layer |
| Configure access | [Permission administration](/documentation/modules/permission-administration) | Company membership, sets and page controls |
| Find every config property | [Config reference](/documentation/reference/page-config) | Reference generated from the current declarations |

## Three backend files for an ordinary table

1. **Migration** creates fields, system columns, company scope where appropriate, business uniqueness and foreign keys.
2. **Model** connects the table to the shared base and entity definition.
3. **API Controller** binds that model with `ApiSource` and inherits shared CRUD.

Five standard HTTP routes represent four operation families: Read, Create, Update and Delete. Read has collection and single-record routes. Do not add a second request/resource/service or a global per-table query map for ordinary CRUD.

## Four frontend files for an ordinary page

The established feature folder contains the page TS, its HTML, the page config and the FactBox config. TS hosts the shared page and handles genuine page-specific behavior. The config describes fields, data sources, relationships, navigation and custom commands.

Core supplies standard actions, validation plumbing, autosave, reads, sorting, filtering, personalization and record features. Do not copy that plumbing into each page.

## Record identity and business relationship are different

`keyField: 'systemId'` addresses an individual API record. It does not choose the business relationship. Users relate to assignment rows through `userName`; PR headers relate to lines through document business fields. Composite keys must include all required matching fields.

## Current implementation boundary

Users, Purchase Requisition and permission administration are the worked references in this guide. Other business modules may still contain compatibility code or incomplete business logic. Their presence in a menu does not establish that their implementation has been reviewed.

The table/API architecture is a foundation for a future SDK. A complete developer-facing SDK generator and publish workflow are not claimed as implemented. The ordinary workflow today is to create the migration, model and controller in the backend repository.

## Keep learning material with the code

These articles are repository Markdown. Config reference pages are generated from TypeScript declarations, and worked examples include current source files. Follow [maintaining documentation](/documentation/maintenance/updating-the-guide) whenever behavior changes.
