import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import { sourceCodeSetupListConfig, sourceCodeSetupHeaderConfig } from './source-code-setup.config';
export * from './source-code-setup.config';

@Component({
  selector: 'app-source-code-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './source-code-setup.html',
})
export class SourceCodeSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = sourceCodeSetupListConfig;
  readonly headerConfig = sourceCodeSetupHeaderConfig;
}
