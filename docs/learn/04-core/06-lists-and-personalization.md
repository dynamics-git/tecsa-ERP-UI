# Lists, filtering and grid behavior

The shared list and line surfaces own standard grid behavior. Page config declares data and presentation, while reusable directives own pointer interaction such as column dragging.

## Browse columns

Use `listColumns(headerConfig, [{field: 'code'}, ...])` to derive field captions and value semantics. Column config can add a presentation override where needed. The API must still allow sorting/filtering on the selected public field.

## Filter and sort

`defaultSort`, `defaultFilter`, search fields and supported filter config feed shared request building. The UI filter component composes the request; the backend executes it securely. Client-visible controls are not a substitute for server query validation.

## Personalization

The shared surface supports configured column visibility, order, resize, freeze and auto-fit, along with view/density/grouping tools where enabled. Dragging a header changes column order; resizing must remain a distinct gesture and must not accidentally sort or drag.

Use the Columns panel for the supported explicit actions. Use saved views for the supported view state. Stable page IDs and column IDs are important: changing them can invalidate saved preferences. Do not store user-specific column order in the module's default business config.

## Tool visibility

```typescript
tools: {
  search: false,
  filter: false,
  columns: false,
  export: false,
}
```

This is appropriate for a focused related worksheet when those tools do not belong in that workflow. Hiding a tool is a presentation choice; it does not revoke the equivalent API permission.

## Empty, loading and read-only states

An editable entry grid can show typed blank entry controls without saved rows. A non-editable/read-only worksheet can keep its plain empty grid structure. These are visual states, not fabricated backend records.

Loading should track outstanding reads. Keep layout stable and show errors accurately. Do not add artificial delays, treat placeholder rows as loaded data, or repeatedly page after an empty API response.

## Reuse instead of enlarging the grid

View and Export menus, Columns and Save view close when the user clicks or taps outside their own panel and trigger. Interactions inside remain available, and Escape dismisses these tools. Outside dismissal does not cancel the clicked action or discard saved personalization. Filters remain a separate persistent side panel with their existing close control.

Put independent grid interactions in the shared directives folder. Keep business filters and fields in config. An ordinary module should not add pointer handling or a second table template to the list component.

## Tokens and readability

List pages use a 20px semibold page title and quiet 12px context text. Column headings use 13px medium text; row values use 14px regular text. Primary record links use the shared brand foreground and semibold weight, with the existing underline/focus treatment. Neutral status badges and list tools stay less prominent than record identity. Active tools receive the shared selected surface and brand foreground. The main document title uses the same page-title role as list titles, so the FactBox title does not dominate the record being edited.

Use shared semantic color tokens for primary text, secondary labels, commands and disabled states. Do not lighten an entire modal to indicate one disabled field. Keep disabled state, readonly state and normal secondary text visually distinct. Avoid page-specific color patches that make only one module readable.

The shared typography uses 14px body/record text, 13px labels and 12px captions. Captions are for supporting metadata, not ordinary column or field labels. Primary record titles remain primary text; labels use a quieter slate token while values retain primary text. Ordinary form and grid values use regular weight; section titles, record identities and grand totals provide emphasis. FactBox uses a subtle shared surface for its header, a 20px record title and distinct section headings. These are shared styles, not per-page config overrides.
