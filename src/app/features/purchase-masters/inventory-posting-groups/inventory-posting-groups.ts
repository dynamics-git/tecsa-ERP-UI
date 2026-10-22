import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  inventoryPostingGroupsListConfig,
  inventoryPostingGroupsHeaderConfig,
} from './inventory-posting-groups.config';
export * from './inventory-posting-groups.config';

@Component({
  selector: 'app-inventory-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './inventory-posting-groups.html',
})
export class InventoryPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = inventoryPostingGroupsListConfig;
  readonly headerConfig = inventoryPostingGroupsHeaderConfig;
}
