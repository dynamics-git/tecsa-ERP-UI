import { NotificationInbox } from '../notification-inbox/notification-inbox';
import { AsyncPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PopupConfig } from '../../../platform/models/popup-config.model';
import { RunModalStackService } from '../../../platform/run-modal/run-modal-stack.service';
import { ProfileDrawer } from '../../../features/auth/profile/profile-drawer';
import { CompanySwitcher } from '../../../features/auth/company-switcher/company-switcher';
import { LoadingIndicator } from '../loading-indicator/loading-indicator';

type DrawerPopupData = {
  drawerViewId?: string;
  drawerData?: unknown;
};

@Component({
  selector: 'app-drawer-host',
  standalone: true,
  imports: [AsyncPipe, ProfileDrawer, NotificationInbox, CompanySwitcher, LoadingIndicator],
  templateUrl: './drawer-host.html',
  styleUrl: './drawer-host.scss'
})
export class DrawerHost {
  private readonly popupStack = inject(RunModalStackService);

  readonly stack$ = this.popupStack.stack$;
  readonly busyCompanies = new Set<string>();

  isCompanySwitcher(popup: PopupConfig): boolean { return this.drawerViewId(popup) === 'company-switcher'; }
  setCompanyBusy(id: string, busy: boolean): void {
    if (busy) this.busyCompanies.add(id); else this.busyCompanies.delete(id);
  }

  getDrawers(popups: PopupConfig[]): PopupConfig[] {
    return popups.filter((popup) => popup.mode === 'drawer');
  }

  isNotificationDrawer(popup: PopupConfig): boolean { return this.drawerViewId(popup)==='notifications'; }

  isProfileDrawer(popup: PopupConfig): boolean {
    return this.drawerViewId(popup) === 'profile';
  }

  close(popupId?: string): void {
    if (popupId && this.busyCompanies.has(popupId)) return;
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
