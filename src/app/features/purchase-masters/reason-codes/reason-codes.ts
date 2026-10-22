import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { reasonCodesListConfig, reasonCodesHeaderConfig } from './reason-codes.config';
export * from './reason-codes.config';

@Component({
  selector: 'app-reason-codes',
  standalone: true,
  imports: [ListPage],
  templateUrl: './reason-codes.html',
})
export class ReasonCodesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = reasonCodesListConfig;
  readonly headerConfig = reasonCodesHeaderConfig;
}
