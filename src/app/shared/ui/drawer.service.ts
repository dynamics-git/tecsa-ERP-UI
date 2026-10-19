import { Injectable } from '@angular/core';
import { PopupSize } from '../../platform/models/popup-config.model';
import { RunModalStackService } from '../../platform/run-modal/run-modal-stack.service';

export interface DrawerRequest {
  id?: string;
  title?: string;
  viewId: string;
  size?: PopupSize;
  data?: Record<string, unknown>;
  allowNested?: boolean;
  closeOnBackdrop?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DrawerService {
  constructor(private readonly popupStack: RunModalStackService) {}

  open(request: DrawerRequest): boolean {
    const popupId = request.id?.trim() || `drawer-${request.viewId}-${Date.now()}`;

    return this.popupStack.open({
      id: popupId,
      title: request.title,
      mode: 'drawer',
      size: request.size ?? 'md',
      allowNested: request.allowNested ?? true,
      closeOnBackdrop: request.closeOnBackdrop ?? true,
      data: {
        drawerViewId: request.viewId,
        drawerData: request.data ?? {}
      }
    });
  }

  close(id?: string): void {
    this.popupStack.close(id);
  }

  closeAll(): void {
    this.popupStack.closeAll();
  }
}
