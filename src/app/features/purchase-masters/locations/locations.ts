import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { locationsListConfig, locationsHeaderConfig } from './locations.config';
export * from './locations.config';

@Component({
  selector: 'app-locations',
  standalone: true,
  imports: [ListPage],
  templateUrl: './locations.html',
})
export class LocationsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = locationsListConfig;
  readonly headerConfig = locationsHeaderConfig;
}
