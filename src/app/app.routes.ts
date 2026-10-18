import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { CustomerPage } from './features/sales/customer/customer';
import { PurchaseRequisitionPage } from './features/purchasing/purchase-requisition/purchase-requisition';
import { NumberSeriesPage } from './features/setup/number-series/number-series';
import { SalesReceivablesSetupPage } from './features/setup/company-setup/sales-receivables-setup';
import { PurchasesPayablesSetupPage } from './features/setup/company-setup/purchases-payables-setup';
import { LoginPage } from './features/auth/login/login';
import { PlatformRedirect } from './features/auth/platform-redirect';
import { authChildGuard, authGuard } from './core/guards/auth.guard';

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
      { path: 'number-series', component: NumberSeriesPage,
        data: { pageId: 'number-series', permissionResource: 'number_series' } },
      { path: 'sales-receivables-setup', component: SalesReceivablesSetupPage,
        data: { pageId: 'sales-receivables-setup', permissionResource: 'sales_receivables_setup' } },
      { path: 'purchases-payables-setup', component: PurchasesPayablesSetupPage,
        data: { pageId: 'purchases-payables-setup', permissionResource: 'purchases_payables_setup' } },
      { path: 'customer', component: CustomerPage, data: { pageId: 'customer', permissionResource: 'customers' } },
      { path: 'purchase-requisition', component: PurchaseRequisitionPage, data: { pageId: 'purchase-requisition', permissionResource: 'purchase_requisitions' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
