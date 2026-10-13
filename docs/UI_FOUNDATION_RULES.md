# TecSA ERP UI — foundation rules

The application is Angular 21. This repository is the TecSA ERP UI source of truth. The existing RunModal system, popup stack, page registry, header/lines, global search, design tokens and state-preserving navigation are core product capabilities, not disposable demonstration code.

## Naming convention

- Folder names and file names: lowercase kebab-case.
- HTML selectors: lowercase kebab-case with `app-` prefix.
- Angular component classes: PascalCase, no mandatory `Component` suffix.
- Services: PascalCase + `Service`.
- Variables/methods: camelCase.
- Avoid unnecessary prefixes (`Erp`, `Filaze`) and misleading `entry-dialog` for a complete document window.
- Paths are grouped by responsibility: application shell, platform navigation/document engine, shared components, business features.

## Current scope and cleanup

Obsolete Filaze package-install scaffolding (`filaze-core/`), old installer instructions, incidental `rg*.txt` output and historical source ZIP have been removed from the active branch. Git history retains them if required.

The current app still imports code from `src/app/shared/erp-core/`. **Do not delete this folder or replace it with a blank scaffold.** Migrate it through tested, behavior-preserving moves in a subsequent commit, updating imports, selectors, barrel exports, tests and scripts together.

Keep only active application features. Before removing any page or service, prove it has no active route, menu, RunModal registration, provider, template, public API consumer or test dependency. Never leave a menu entry pointing at deleted functionality.

## Delivery gates

- Work on a dedicated branch; do not merge to `main` until validated. Main triggers FTP deployment.
- No visual redesign, new feature page, or Laravel API rewrite during naming-only changes.
- Preserve RunModal nesting and underlying document state, without introducing route-only navigation.
- CI: `npm ci`, `npm run lint`, `npm run build`, `npm test -- --watch=false`.
- Require a browser acceptance pass for nested window navigation, record loading, dirty state and return context before declaring the UI release-ready.
