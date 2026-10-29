import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { userSessionsListConfig, userSessionsHeaderConfig, userSessionsLineConfig } from './user-sessions.config';
export * from './user-sessions.config';

@Component({
  selector: 'app-user-sessions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './user-sessions.html',
})
export class UserSessionsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = userSessionsListConfig;
  readonly headerConfig = userSessionsHeaderConfig;
  readonly lineConfig = userSessionsLineConfig;
}
