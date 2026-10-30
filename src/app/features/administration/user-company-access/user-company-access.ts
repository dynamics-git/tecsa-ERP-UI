import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  userCompanyAccessHeaderConfig,
  userCompanyAccessLineConfig,
  userCompanyAccessListConfig,
} from './user-company-access.config';
export * from './user-company-access.config';

@Component({
  selector: 'app-user-company-access',
  standalone: true,
  imports: [ListPage],
  templateUrl: './user-company-access.html',
})
export class UserCompanyAccessPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = userCompanyAccessListConfig;
  readonly headerConfig = userCompanyAccessHeaderConfig;
  readonly lineConfig = userCompanyAccessLineConfig;
}
