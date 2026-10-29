import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { userCompaniesListConfig, userCompaniesHeaderConfig, userCompaniesLineConfig } from './user-companies.config';
export * from './user-companies.config';

@Component({
  selector: 'app-user-companies',
  standalone: true,
  imports: [ListPage],
  templateUrl: './user-companies.html',
})
export class UserCompaniesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = userCompaniesListConfig;
  readonly headerConfig = userCompaniesHeaderConfig;
  readonly lineConfig = userCompaniesLineConfig;
}
