import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { itemChargesListConfig, itemChargesHeaderConfig } from './item-charges.config';
export * from './item-charges.config';

@Component({
  selector: 'app-item-charges',
  standalone: true,
  imports: [ListPage],
  templateUrl: './item-charges.html',
})
export class ItemChargesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = itemChargesListConfig;
  readonly headerConfig = itemChargesHeaderConfig;
}
