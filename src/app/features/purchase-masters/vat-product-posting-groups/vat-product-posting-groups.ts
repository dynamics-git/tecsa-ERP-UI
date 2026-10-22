import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  vatProductPostingGroupsListConfig,
  vatProductPostingGroupsHeaderConfig,
} from './vat-product-posting-groups.config';
export * from './vat-product-posting-groups.config';

@Component({
  selector: 'app-vat-product-posting-groups',
  standalone: true,
  imports: [ListPage],
  templateUrl: './vat-product-posting-groups.html',
})
export class VatProductPostingGroupsPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = vatProductPostingGroupsListConfig;
  readonly headerConfig = vatProductPostingGroupsHeaderConfig;
}
