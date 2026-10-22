import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { warehouseZonesListConfig, warehouseZonesHeaderConfig } from './warehouse-zones.config';
export * from './warehouse-zones.config';

@Component({
  selector: 'app-warehouse-zones',
  standalone: true,
  imports: [ListPage],
  templateUrl: './warehouse-zones.html',
})
export class WarehouseZonesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = warehouseZonesListConfig;
  readonly headerConfig = warehouseZonesHeaderConfig;
}
