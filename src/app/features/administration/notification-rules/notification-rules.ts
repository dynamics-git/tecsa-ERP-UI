import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  notificationRulesListConfig,
  notificationRulesHeaderConfig,
} from './notification-rules.config';
export * from './notification-rules.config';
@Component({
  selector: 'app-notification-rules',
  standalone: true,
  imports: [ListPage],
  template:
    '<app-list-page [listConfig]="listConfig" [headerConfig]="headerConfig" [documentOnly]="!!runModal" [initialRecord]="runModal?.record" (closeRequested)="runModal?.close()" />',
})
export class NotificationRulesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = notificationRulesListConfig;
  readonly headerConfig = notificationRulesHeaderConfig;
}
