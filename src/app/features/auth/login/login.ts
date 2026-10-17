import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService, AuthorizedCompany } from '../../../core/services/auth.service';
import { IdleSessionService } from '../../../core/services/idle-session.service';
import { SessionService } from '../../../core/services/session.service';
import { UtilityService } from '../../../core/services/utility.service';
import { ApiErrorService } from '../../../platform/public-api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly changes = inject(ChangeDetectorRef);
  loggingIn = false;
  errorMessage = '';
  availableCompanies: AuthorizedCompany[] = [];
  choosingCompany = false;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  constructor(
    private readonly authService: AuthService,
    private readonly apiError: ApiErrorService,
    private readonly idleSessionService: IdleSessionService,
    private readonly router: Router,
    private readonly sessionService: SessionService,
    private readonly utilityService: UtilityService,
  ) {}

  ngOnInit(): void {
    this.sessionService.IP = this.utilityService.generateUUID();
  }

  login(): void {
    this.errorMessage = '';
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loggingIn || this.choosingCompany) return;

    this.loggingIn = true;
    const value = this.form.getRawValue();
    this.authService.login({ email: value.email.trim(), password: value.password }).pipe(
      finalize(() => { this.loggingIn = false; this.changes.markForCheck(); }),
    ).subscribe({
      next: (result) => {
        if (result.requiresCompanySelection) {
          this.availableCompanies = result.companies;
          this.choosingCompany = true;
          this.form.controls.password.reset();
          return;
        }
        this.finishLogin();
      },
      error: (error: unknown) => { this.errorMessage = this.getErrorMessage(error); },
    });
  }

  chooseCompany(companyId: string): void {
    if (this.loggingIn || !this.choosingCompany) return;
    this.errorMessage = '';
    this.loggingIn = true;
    this.authService.selectCompany(companyId).pipe(
      finalize(() => { this.loggingIn = false; this.changes.markForCheck(); }),
    ).subscribe({
      next: () => this.finishLogin(),
      error: (error: unknown) => { this.errorMessage = this.getErrorMessage(error); },
    });
  }

  restart(): void {
    this.availableCompanies = [];
    this.choosingCompany = false;
    this.errorMessage = '';
  }

  private finishLogin(): void {
    this.idleSessionService.start();
    void this.router.navigate(['/']).then((navigated) => {
      if (!navigated) this.errorMessage = 'Signed in, but navigation was blocked.';
    });
  }

  private getErrorMessage(error: unknown): string {
    return this.apiError.toMessage(error, 'Sign-in failed. Check your connection and credentials.');
  }
}
