import { afterEach, describe, expect, it } from 'vitest';
import { moveQuickEntry } from './quick-entry';
afterEach(()=>{document.body.innerHTML='';});
function press(input:HTMLInputElement,shiftKey=false){input.addEventListener('keydown',moveQuickEntry);input.focus();input.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',shiftKey,bubbles:true,cancelable:true}));}
describe('Configured Enter quick entry',()=>{
 it('follows document field order across sections, skips excluded/disabled/collapsed fields and supports reverse navigation',()=>{
  document.body.innerHTML='<app-document-window><div class="entry-work"><app-dynamic-form><label data-quick-entry="true"><input id="first"></label><label data-quick-entry="false"><input id="skip"></label></app-dynamic-form><app-dynamic-form hidden><label data-quick-entry="true"><input></label></app-dynamic-form><app-dynamic-form><label data-quick-entry="true"><input disabled></label><label data-quick-entry="true"><input id="last"></label></app-dynamic-form></div></app-document-window>';
  const first=document.querySelector<HTMLInputElement>('#first')!,last=document.querySelector<HTMLInputElement>('#last')!;
  press(first);expect(document.activeElement).toBe(last);press(last,true);expect(document.activeElement).toBe(first);
 });
 it('does not steal lookup selection or move focus into another popup',()=>{
  document.body.innerHTML='<app-dynamic-form><label data-quick-entry="true"><input aria-expanded="true"></label><label data-quick-entry="true"><input></label></app-dynamic-form><app-dynamic-form><label data-quick-entry="true"><input id="other"></label></app-dynamic-form>';
  const first=document.querySelector('input')!;press(first);expect(document.activeElement).toBe(first);
  first.removeAttribute('aria-expanded');press(first);const second=document.querySelectorAll('input')[1];expect(document.activeElement).toBe(second);
  press(second);expect(document.activeElement).toBe(second);
 });
});
