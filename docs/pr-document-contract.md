# Purchase Requisition document contract

## Record identity and document relationship

`systemId` remains the API identity for reading, updating and deleting a record.
The PR line collection is `/purchaseRequisitionLines`. The page explicitly matches:

- Header `number` to line `documentNumber`.
- Header `documentType` to line `documentType`.

The optional shared `parentFieldMap` maps child API field names to header response field names. Existing `parentKeyField`, `documentNoField`, fixed fields and navigation configuration remain supported. Missing mapped values prevent child creation. No document-type constant is supplied by the frontend.

```ts
dataSource: {
  endpoint: '/purchaseRequisitionLines',
  documentNoField: 'number',
  parentKeyField: 'documentNumber',
  parentFieldMap: { documentType: 'documentType' },
  invalidates: ['/purchaseRequisitions'],
  defaultSort: 'lineNo asc',
}
```

The header displays read-only `documentTypeLabel`. The raw `documentType` is retained in header data for relationships. Neither the caption nor document type is written by the header form. Line writes invalidate cached header aggregates through the existing `invalidates` override.

## Backend dependency

The matching backend must return both `documentType` and `documentTypeLabel`, and support the independent line collection and record routes. A database migration alone does not update an API server. Do not substitute a frontend constant when the API omits the type.

## Verification and limits

Production build and import/token lint passed during implementation. TypeScript compilation passed after the final label binding. Test suites were not rerun after the user instructed us to stop test execution. The earlier PR frontend run had 32 passing tests and two reopen/totals failures; these have NOT been confirmed resolved. Fixtures were updated to the new contract. No claim of verified live autosave/close/reopen is made.

This is an implementation note, not the complete partner SDK manual. The requested comprehensive developer PDF remains outstanding.
