import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { warehouseBinsListConfig, warehouseBinsHeaderConfig } from './warehouse-bins.config';
export * from './warehouse-bins.config';

@Component({
  selector: 'app-warehouse-bins',
  standalone: true,
  imports: [ListPage],
  templateUrl: './warehouse-bins.html',
})
export class WarehouseBinsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = warehouseBinsListConfig;
  readonly headerConfig = warehouseBinsHeaderConfig;
}
