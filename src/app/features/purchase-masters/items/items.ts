import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { itemsListConfig, itemsHeaderConfig } from './items.config';
export * from './items.config';

@Component({
  selector: 'app-items',
  standalone: true,
  imports: [ListPage],
  templateUrl: './items.html',
})
export class ItemsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = itemsListConfig;
  readonly headerConfig = itemsHeaderConfig;
}
