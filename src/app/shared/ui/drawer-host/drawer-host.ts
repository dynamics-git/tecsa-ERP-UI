import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PopupConfig } from '../../../platform/models/popup-config.model';
import { RunModalStackService } from '../../../platform/run-modal/run-modal-stack.service';
import { ProfileDrawer } from '../../../features/auth/profile/profile-drawer';

type DrawerPopupData = {
  drawerViewId?: string;
  drawerData?: unknown;
};

@Component({
  selector: 'app-drawer-host',
  standalone: true,
  imports: [AsyncPipe, ProfileDrawer],
  templateUrl: './drawer-host.html',
  styleUrl: './drawer-host.scss'
})
export class DrawerHost {
  private readonly popupStack = inject(RunModalStackService);

  readonly stack$ = this.popupStack.stack$;

  getDrawers(popups: PopupConfig[]): PopupConfig[] {
    return popups.filter((popup) => popup.mode === 'drawer');
  }

  isProfileDrawer(popup: PopupConfig): boolean {
    return this.drawerViewId(popup) === 'profile';
  }

  close(popupId?: string): void {
    this.popupStack.close(popupId);
  }

  onBackdropClick(popup: PopupConfig): void {
    if (popup.closeOnBackdrop !== false) {
      this.close(popup.id);
    }
  }

  private drawerViewId(popup: PopupConfig): string {
    const data = this.toDrawerData(popup.data);
    return String(data.drawerViewId ?? '').trim();
  }

  private toDrawerData(value: unknown): DrawerPopupData {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return value as DrawerPopupData;
  }
}
