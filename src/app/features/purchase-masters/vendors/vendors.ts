import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { vendorsListConfig, vendorsHeaderConfig } from './vendors.config';
export * from './vendors.config';

@Component({
  selector: 'app-vendors',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vendors.html',
})
export class VendorsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vendorsListConfig;
  readonly headerConfig = vendorsHeaderConfig;
}
