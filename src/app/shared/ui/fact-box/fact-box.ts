import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FactBoxSectionConfig } from '../../../platform/models/document-window-config.model';

@Component({
  selector: 'app-fact-box',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fact-box.html',
  styleUrl: './fact-box.scss'
})
export class FactBox {
  @Input() sections: FactBoxSectionConfig[] = [];
  @Output() action = new EventEmitter<string>();

  runAction(actionKey: string): void {
    if (!actionKey) {
      return;
    }

    this.action.emit(actionKey);
  }
}
