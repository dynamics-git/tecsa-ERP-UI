import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { PurchaseOrderPage } from './features/purchasing/purchase-order/purchase-order';
import { LoginPage } from './features/auth/login/login';
import { SaasLandingPage } from './features/marketing/landing/saas-landing-page';
import { TrialSignupPage } from './features/marketing/signup/trial-signup-page';
import { authChildGuard, authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'welcome', component: SaasLandingPage, title: 'TecSA ERP | Business in sync' },
  { path: 'start', component: TrialSignupPage, title: 'Explore TecSA ERP | Start your journey' },
  { path: 'auth/login', component: LoginPage },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: '', component: DashboardPage },
      { path: 'purchase-order', component: PurchaseOrderPage, data: { pageId: 'purchase-order' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
