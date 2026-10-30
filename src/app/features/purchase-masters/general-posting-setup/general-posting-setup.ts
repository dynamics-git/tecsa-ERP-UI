import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  generalPostingSetupListConfig,
  generalPostingSetupHeaderConfig,
} from './general-posting-setup.config';
export * from './general-posting-setup.config';

@Component({
  selector: 'app-general-posting-setup',
  standalone: true,
  imports: [ListPage],
  templateUrl: './general-posting-setup.html',
})
export class GeneralPostingSetupPage {
  @Input() runModal?: RunModalPageWindow;
  readonly listConfig = generalPostingSetupListConfig;
  readonly headerConfig = generalPostingSetupHeaderConfig;
}
