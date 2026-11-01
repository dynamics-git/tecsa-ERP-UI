# FactBox, Notes and Attachments

FactBox config describes the side panel while shared core binds it to the selected or open record. Do not create per-page Notes/Files save code for an ordinary published source.

## A standard FactBox

```typescript
{
  enabled: true,
  label: 'User information',
  overview: true,
  notes: true,
  attachments: true,
  defaultSectionId: 'overview',
  binding: {titleField: 'userName', subtitleField: 'name'},
  sections: [{
    id: 'details', title: 'Details',
    fields: [{id: 'created', label: 'Created at', field: 'systemCreatedAt', type: 'datetime'}],
  }],
}
```

## Sections and metrics

Sections can contain fields, badges and commands. `layout: 'metrics'` presents metrics using the shared style. Use binding fields to show meaningful record titles. Avoid duplicating labels/types already available from declared field metadata unless the FactBox needs a deliberate override.

Fields can opt out of automatic overview presentation with `factBox: false`. Secrets must also be excluded server-side; a hidden FactBox field is not data protection.

## Custom panels

`panels` can set the order or include a trusted compiled component accepting the supported context/data inputs. This is an extension point for real presentation needs, not a reason to replace the default FactBox for each module. See the generated [FactBox reference](/documentation/reference/fact-box-config).

## Record features are not business relationships

Notes and files attach to the published source and an individual record. This requires its record identity internally. That does not make the record ID the business FK between Users and permission assignments or between document headers and lines.

An unsaved record has no persisted attachment owner yet. Do not invent a fake ID or attach files to another selected row to bypass that state.

## Diagnosing a missing Notes route

Check that the API source is published, the endpoint matches its source, company/workspace access is valid, and shared scope honors `companyColumn: null` for shared records. A route-not-found response is a contract problem; it should not be hidden by a page-local stub.

## Permissions

Overview visibility, upload/delete commands and shared record endpoints must honor the current permission context. A custom panel must not bypass the same checks. A company switch must not retain a previous company's selected record or files as if they belonged to the new context.

## Text hierarchy

Use the shared text roles consistently: record titles and section headings are primary and semibold; labels are slate at 13px; values are primary at 14px and regular weight. Metric values use 20px semibold text. Inactive tabs and supporting descriptions use secondary text, while the selected tab uses the existing brand token.

Do not make every value or label bold. Ordinary totals remain regular; the grand total receives emphasis. Readonly values keep normal readable contrast. These roles belong in shared tokens and styles, not individual module config.
