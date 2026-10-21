import { Component, Input } from '@angular/core';
@Component({
 selector: 'app-loading-indicator', standalone: true,
 template: '<span class="loading" [class.compact]="compact" role="status" aria-live="polite" aria-atomic="true"><span class="spinner" aria-hidden="true"></span><span>{{ label }}</span></span>',
 styleUrl: './loading-indicator.scss',
})
export class LoadingIndicator {
 @Input() label = 'Loading…';
 @Input() compact = false;
}
