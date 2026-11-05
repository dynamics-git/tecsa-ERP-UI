# Filaz ERP Visual Foundation

This document records the current visual source of truth for the Filaz ERP UI before continuing Dynamics-style mastering.

## Rollback Point

Use this Git checkpoint as the visual reference:

- Commit: `892740941d481bb22207065362482082c008620c`
- Short commit: `8927409`
- Commit message: `2nd pop up`

This is the approved visual state for the entry pane, nested popup, header/action rhythm, compact ERP spacing, and dashboard shell direction.

## Visual Source Files

These files define the restored popup and layout visual foundation:

- `src/app/layout/main-layout/main-layout.html`
- `src/app/layout/main-layout/main-layout.scss`
- `src/app/layout/main-layout/main-layout.ts`
- `src/app/layout/entry-dialog/entry-dialog.html`
- `src/app/layout/entry-dialog/entry-dialog.scss`
- `src/app/layout/entry-dialog/entry-dialog.ts`

These global style files support the foundation and should remain stable:

- `src/styles.scss`
- `src/app/assets/styles/_tokens.scss`
- `src/app/assets/styles/_base.scss`
- `src/app/assets/styles/_layout.scss`
- `src/app/assets/styles/_buttons.scss`
- `src/app/assets/styles/_forms.scss`
- `src/app/assets/styles/_tables.scss`
- `src/app/assets/styles/_commandbar.scss`

## Current State

- `main-layout` is restored to the `2nd pop up` visual structure.
- `entry-dialog` is restored to the `2nd pop up` nested popup structure.
- `_base.scss` and `styles.scss` were checked and are not the cause of the visual regression.
- Build passes with existing budget/CommonJS warnings.

## Hard Visual Rules

- Do not redesign the Filaz UI without explicit approval.
- Do not replace the header/action/layout rhythm.
- Do not introduce page-specific visual systems for ERP pages.
- Do not copy old app UI into the new app.
- Old app is reference for logic/API/data shape only.
- New app visual source of truth is the Filaz design restored from `2nd pop up`.

## Dynamics Mastering Direction

The next Dynamics-style work should use the restored visual foundation as the shell:

- Header and global actions stay in the existing Filaz layout.
- Entry pane and nested popup behavior come from `main-layout` and `entry-dialog`.
- Future ERP document/list rendering should be config-driven underneath, but visually mapped to this foundation.
- Factbox must be reusable and config-driven, but its spacing and hierarchy must follow the approved Filaz visual style.
- Purchase Order, Purchase Invoice, and future modules should not invent new page-level SCSS.

## Safe Workflow

Before changing visual files:

1. Compare against `8927409`.
2. Change only the smallest required file.
3. Keep CSS class naming aligned with current `app-` and `ui-` conventions.
4. Build after changes.
5. If visual structure changes, document why in this file.


## 6 November 2026: authorized whole-ERP refinement

The user authorized a compact, sharper shared ERP presentation inspired by
Business Central readability while retaining TecSA navy identity. This refines
the earlier visual checkpoint: shared body/label/command text is 13px, controls
30px, sections 16px semibold and record titles 24px regular. Navy remains the
brand/action color; readable neutral text carries ordinary data and captions.
Use typography/component/color tokens across lists, forms, documents, worksheets,
FactBoxes and dashboard surfaces. No page-specific renderer or business change.
Keep Header, Lines, calculations and following sections in their existing flow;
do not add a gap or separate Header from Lines. Shared checkbox/focus fixes and
the resizable default Lines area remain in place.
