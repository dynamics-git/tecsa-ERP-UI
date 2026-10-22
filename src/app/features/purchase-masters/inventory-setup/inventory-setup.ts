import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { inventorySetupListConfig, inventorySetupHeaderConfig } from './inventory-setup.config';
export * from './inventory-setup.config';

@Component({
  selector: 'app-inventory-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './inventory-setup.html',
})
export class InventorySetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = inventorySetupListConfig;
  readonly headerConfig = inventorySetupHeaderConfig;
}
