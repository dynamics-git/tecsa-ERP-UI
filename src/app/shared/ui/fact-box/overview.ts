import { inject } from '@angular/core';
import { DocumentPageCommandPermissionService } from '../../../platform/pages/document-page-command-permission.service';
import type { CommandConfig } from '../../../platform/models/command-config.model';
import { Component, Input } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import type { FactBoxSectionConfig } from '../../../platform/models/document-window-config.model';
import type { FactBoxContext } from '../../../platform/models/fact-box-context.model';

@Component({
  selector: 'app-factbox-overview',
  standalone: true,
  imports: [NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './overview.html',
  styleUrl: './overview.scss',
})
export class FactBoxOverview {
  private readonly permissions = inject(DocumentPageCommandPermissionService);
  buttonState(button: CommandConfig): CommandConfig {
    return this.permissions.apply(button, this.context.pageId ?? '');
  }
  @Input() sections: FactBoxSectionConfig[] = [];
  @Input() context: FactBoxContext = {};
}
