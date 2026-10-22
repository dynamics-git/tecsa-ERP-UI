import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  vendorDefaultDimensionsListConfig,
  vendorDefaultDimensionsHeaderConfig,
  vendorDefaultDimensionsLineConfig,
} from './vendor-default-dimensions.config';
export * from './vendor-default-dimensions.config';

@Component({
  selector: 'app-vendor-default-dimensions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vendor-default-dimensions.html',
})
export class VendorDefaultDimensionsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vendorDefaultDimensionsListConfig;
  readonly headerConfig = vendorDefaultDimensionsHeaderConfig;
  readonly lineConfig = vendorDefaultDimensionsLineConfig;
}
