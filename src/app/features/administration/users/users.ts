import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { usersListConfig, usersHeaderConfig } from './users.config';
export * from './users.config';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [ListPage],
  templateUrl: './users.html',
})
export class UsersPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = usersListConfig;
  readonly headerConfig = usersHeaderConfig;
}
