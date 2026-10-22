import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  generalBusinessPostingGroupsListConfig,
  generalBusinessPostingGroupsHeaderConfig,
} from './general-business-posting-groups.config';
export * from './general-business-posting-groups.config';

@Component({
  selector: 'app-general-business-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './general-business-posting-groups.html',
})
export class GeneralBusinessPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = generalBusinessPostingGroupsListConfig;
  readonly headerConfig = generalBusinessPostingGroupsHeaderConfig;
}
