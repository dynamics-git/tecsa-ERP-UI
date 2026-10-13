import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { IdleSessionService } from '../../../core/services/idle-session.service';
import { SessionService } from '../../../core/services/session.service';
import { UtilityService } from '../../../core/services/utility.service';
import { ApiErrorService } from '../../../platform/public-api';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginPage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);

  loggingIn = false;
  errorMessage = '';

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  constructor(
    private readonly authService: AuthService,
    private readonly apiError: ApiErrorService,
    private readonly idleSessionService: IdleSessionService,
    private readonly router: Router,
    private readonly sessionService: SessionService,
    private readonly utilityService: UtilityService
  ) {}

  ngOnInit(): void {
    this.sessionService.IP = this.utilityService.generateUUID();
  }

  login(): void {
    this.errorMessage = '';
    this.form.markAllAsTouched();

    if (this.form.invalid || this.loggingIn) {
      return;
    }

    this.loggingIn = true;
    const value = this.form.getRawValue();

    this.authService.login({
      email: value.email.trim(),
      password: value.password
    }).pipe(
      finalize(() => {
        this.loggingIn = false;
      })
    ).subscribe({
      next: () => {
        this.idleSessionService.start();
        void this.router.navigate(['/']).then((navigated) => {
          if (!navigated) {
            this.errorMessage = 'Login succeeded but navigation was blocked.';
          }
        });
      },
      error: (error: unknown) => {
        this.errorMessage = this.getErrorMessage(error);
      }
    });
  }

  private getErrorMessage(error: unknown): string {
    return this.apiError.toMessage(error, 'Login failed. Please check your connection and credentials.');
  }
}
