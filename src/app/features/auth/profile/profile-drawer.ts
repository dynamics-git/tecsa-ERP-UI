import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { SessionService } from '../../../core/services/session.service';

@Component({
  selector: 'app-profile-drawer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-drawer.html',
  styleUrl: './profile-drawer.scss'
})
export class ProfileDrawer {
  private readonly sessionService = inject(SessionService);

  get displayName(): string {
    return this.sessionService.UserName || this.sessionService.Email || 'User';
  }

  get email(): string {
    return this.sessionService.Email || 'N/A';
  }

  get roleId(): string {
    return this.sessionService.RoleId || 'N/A';
  }

  get companyName(): string {
    return this.sessionService.CompanyName || 'N/A';
  }

  get companyId(): string {
    return this.sessionService.Company || 'N/A';
  }

  get environmentLabel(): string {
    return environment.isLive || environment.production ? 'Live' : 'Sandbox';
  }

  get initials(): string {
    const tokens = this.displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());

    return tokens.length ? tokens.join('') : 'U';
  }

  logout(): void {
    this.sessionService.logout('drawer-logout');
  }
}
