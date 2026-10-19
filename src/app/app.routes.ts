import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { PurchaseOrderPage } from './features/purchasing/purchase-order/purchase-order';
import { LoginPage } from './features/auth/login/login';
import { PlatformRedirect } from './features/auth/platform-redirect';
import { authChildGuard, authGuard } from './core/guards/auth.guard';
import { NoSeriesPage } from './features/administration/no-series/no-series';
import { PurchaseRequisitionPage } from './features/purchasing/purchase-requisition/purchase-requisition';
import { PurchasesPayablesSetupPage } from './features/setup/purchases-payables-setup/purchases-payables-setup';
import { SalesReceivablesSetupPage } from './features/setup/sales-receivables-setup/sales-receivables-setup';

export const routes: Routes = [
  { path: 'welcome', component: PlatformRedirect },
  { path: 'start', component: PlatformRedirect, data:{registration:true} },
  { path: 'auth/login', component: LoginPage },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      { path: '', component: DashboardPage },
      { path: 'purchase-order', component: PurchaseOrderPage, data: { pageId: 'purchase-order' } },
      { path: 'no-series', component: NoSeriesPage, data: { pageId: 'no-series' } },
      { path: 'purchase-requisition', component: PurchaseRequisitionPage, data: { pageId: 'purchase-requisition' } },
      { path: 'purchases-payables-setup', component: PurchasesPayablesSetupPage, data: { pageId: 'purchases-payables-setup' } },
      { path: 'sales-receivables-setup', component: SalesReceivablesSetupPage, data: { pageId: 'sales-receivables-setup' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
