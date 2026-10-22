import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  generalProductPostingGroupsListConfig,
  generalProductPostingGroupsHeaderConfig,
} from './general-product-posting-groups.config';
export * from './general-product-posting-groups.config';

@Component({
  selector: 'app-general-product-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './general-product-posting-groups.html',
})
export class GeneralProductPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = generalProductPostingGroupsListConfig;
  readonly headerConfig = generalProductPostingGroupsHeaderConfig;
}
