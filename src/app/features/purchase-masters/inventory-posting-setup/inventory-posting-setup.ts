import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { inventoryPostingSetupListConfig, inventoryPostingSetupHeaderConfig } from './inventory-posting-setup.config';
export * from './inventory-posting-setup.config';

@Component({
  selector: 'app-inventory-posting-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './inventory-posting-setup.html',
})
export class InventoryPostingSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = inventoryPostingSetupListConfig;
  readonly headerConfig = inventoryPostingSetupHeaderConfig;
}
