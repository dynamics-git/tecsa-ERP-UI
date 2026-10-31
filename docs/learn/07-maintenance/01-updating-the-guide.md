# Maintain the learning guide

Documentation ships with the UI and is versioned in Git. Update the relevant article in the same change as the behavior it explains. This is an ongoing development rule, not a background automation or a database content editor.

## Add or edit an article

Create Markdown under `docs/learn/<ordered-section>/<ordered-article>.md`. Discovery is automatic. Numeric prefixes order the navigation and are removed from public article IDs.

```text
docs/learn/05-modules/03-your-module.md
→ /documentation/modules/your-module
```

Start with one H1 title and a useful opening paragraph. Use H2/H3 headings for the right-hand article contents. Use fenced code blocks with a language, tables for comparisons and relative application links beginning `/documentation/`.

```markdown
# Your module

Explain what a developer or user can accomplish.

## Data and API

Describe the verified contract.

## UI configuration

Include a working example and explain its keys.

## Exceptions and limitations

State what differs from the ordinary pattern and why.
```

## Include current source

An article can include a repository file using a source directive. See the Users example's Markdown for the exact directive syntax. Source inclusion is restricted to repository code/docs/rules; it must not pull in environment files or secrets.

The generated reference reads TypeScript interfaces/type aliases from the platform models. Do not hand-edit generated JSON or manually copy all property tables into another catalog. Add explanatory guidance when a new option needs a usage example.

## Build and validate

```sh
npm run docs:build
npm run docs:check
npm run build
npm run lint
```

Normal `npm start` and `npm run build` generate the assets. Development watches article/model/feature changes. The output `public/documentation/content.json` is generated and ignored by Git; production assets are included in the Angular build.

## Backend changes

When an API contract, table relationship, hook or source option changes, update the matching backend guide here and the backend repository's architecture/contract documents. If work spans repositories, include both revisions in the review. The frontend build deliberately does not depend on a backend checkout path.

## Frontend changes

When a config option, page type, validation flow, modal relation or shared control changes, update a guided example and the relevant core article. Reference tables regenerate, but their existence alone does not explain a feature's behavior.

## Module completion

Document tables, API sources, user journey, commands, permissions, business invariants, exceptions and the actual verification performed. Distinguish implemented behavior from planned features. Add an entry to [What's new](/documentation/maintenance/whats-new).

## Editing and access

This first version uses code-reviewed Markdown as the editing workflow. There is no in-browser article editor or documentation database API. The documentation route is a reading surface outside application login, so do not put secrets, customer data, internal credentials or non-public deployment details in its content.

The Documentation header link opens a new tab and leaves the ERP page state intact. The documentation does not query business tables or alter permissions.
