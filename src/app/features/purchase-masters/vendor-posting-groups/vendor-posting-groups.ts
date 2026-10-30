import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  vendorPostingGroupsListConfig,
  vendorPostingGroupsHeaderConfig,
} from './vendor-posting-groups.config';
export * from './vendor-posting-groups.config';

@Component({
  selector: 'app-vendor-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vendor-posting-groups.html',
})
export class VendorPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vendorPostingGroupsListConfig;
  readonly headerConfig = vendorPostingGroupsHeaderConfig;
}
