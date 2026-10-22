import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { sourceCodesListConfig, sourceCodesHeaderConfig } from './source-codes.config';
export * from './source-codes.config';

@Component({
  selector: 'app-source-codes',
  standalone: true,
  imports: [ListPage],
  templateUrl: './source-codes.html',
})
export class SourceCodesPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = sourceCodesListConfig;
  readonly headerConfig = sourceCodesHeaderConfig;
}
