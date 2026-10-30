import { Component, Input } from '@angular/core';
import { ListPage, RunModalPageWindow } from '../../../platform/public-api';
import {
  pagePermissionsHeaderConfig,
  pagePermissionsLineConfig,
  pagePermissionsListConfig,
} from './page-permissions.config';
export * from './page-permissions.config';

@Component({
  selector: 'app-page-permissions',
  standalone: true,
  imports: [ListPage],
  templateUrl: './page-permissions.html',
})
export class PagePermissionsPage {
  private window?: RunModalPageWindow;
  @Input() set runModal(value: RunModalPageWindow | undefined) {
    this.window = value;
    this.lineConfig = value?.record?.['isSystem'] === true
      ? {...pagePermissionsLineConfig, editable: false, dataSource: {...pagePermissionsLineConfig.dataSource,
        supportsCreate: false, supportsUpdate: false, supportsDelete: false}}
      : pagePermissionsLineConfig;
  }
  get runModal(): RunModalPageWindow | undefined { return this.window; }
  readonly listConfig = pagePermissionsListConfig;
  readonly headerConfig = pagePermissionsHeaderConfig;
  lineConfig = pagePermissionsLineConfig;
}
