# What's new in developer documentation

Use this page to record reviewed development changes and link readers to the matching guide. Do not treat a roadmap item as a completed feature.

## 1 November 2026: document text hierarchy

Kept the line grid aligned with the document body after reviewing an inset scrollbar treatment. The added gap created an unnecessary strip and was removed; independent document/grid scrolling remains unchanged.

Extended the same hierarchy to list pages: 20px main titles, quieter context/toolbar text, medium column headers, brand-coloured record links and restrained neutral badges. Main document titles now match the FactBox title size. Row content, page configuration and record behavior are unchanged.

Refined shared foreground roles after the initial readability change: primary titles/data remain dark; labels, inactive tabs and metadata use distinct slate roles. Kept 14px body/13px labels, reduced ordinary form/grid value weight, retained section/grand-total emphasis, and made FactBox metric values more prominent. The documentation portal already belongs to `ui-corefixed`; no duplicate documentation merge is required.

## 31 October 2026: learning guide foundation

- Added the separate Documentation reading surface linked beside Company.
- Added backend migration/model/API tutorials, business-key relationships and query/concurrency guidance.
- Added UI page-type guides, autosave/validation, lookups, RunModal, calculations, FactBox and grid guidance.
- Added Users, PR and Page Permissions examples included from source.
- Added config reference generated from the current platform declarations.
- Added module guides for permission administration and PR, plus the maintenance workflow.

## Existing work captured by this guide

### 31 October 2026: shared readability review

Raised shared body text to 14px and labels to 13px, strengthened secondary text tokens, and clarified the shared FactBox header/section hierarchy. List primary values and line column labels follow those shared roles. Captions remain 12px for supporting metadata. This styling change does not alter page config, permission logic or API behavior.

The baseline permission work was committed before this documentation feature: frontend `ae0b81e`, backend `d6cc618`. Those revisions align permission APIs and business-key relationships with shared CRUD and UI autosave.

This entry records the documentation starting point, not a claim that every business module or a full SDK generator has been completed. Browser verification and module acceptance should be reported against the specific change being reviewed.

## Add the next change

After completing a module or a core change, add a dated entry with its behavior, affected guide and any migration/compatibility requirement. Keep detailed developer instructions in the relevant article rather than growing this page into a second architecture manual.
