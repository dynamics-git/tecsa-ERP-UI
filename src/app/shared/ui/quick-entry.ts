/** Enter follows configured quick-entry fields; Tab retains normal accessible navigation. */
export function moveQuickEntry(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.key !== 'Enter' || event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.getAttribute('aria-expanded') === 'true') return;
  const window = target.closest('app-document-window');
  const scope = window?.querySelector('.entry-work') ?? target.closest('app-dynamic-form, app-document-lines');
  if (!scope) return;
  const fields = Array.from(scope.querySelectorAll<HTMLElement>('[data-quick-entry="true"]'));
  const current = fields.findIndex(field => field.contains(target));
  if (current < 0) return;
  const direction = event.shiftKey ? -1 : 1;
  for (let index = current + direction; index >= 0 && index < fields.length; index += direction) {
    const field = fields[index];
    if (field.closest('[hidden], [inert]')) continue;
    const editor = field.querySelector<HTMLInputElement | HTMLSelectElement>('input:not([type="hidden"]), select');
    if (!editor || editor.disabled || editor instanceof HTMLInputElement && editor.readOnly) continue;
    event.preventDefault(); event.stopPropagation(); editor.focus(); return;
  }
}
