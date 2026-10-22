import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  vatBusinessPostingGroupsListConfig,
  vatBusinessPostingGroupsHeaderConfig,
} from './vat-business-posting-groups.config';
export * from './vat-business-posting-groups.config';

@Component({
  selector: 'app-vat-business-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vat-business-posting-groups.html',
})
export class VatBusinessPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vatBusinessPostingGroupsListConfig;
  readonly headerConfig = vatBusinessPostingGroupsHeaderConfig;
}
