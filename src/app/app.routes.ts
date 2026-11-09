import { getFeaturePageRoutes } from './core/services/page-registry';
import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { PurchaseOrderPage } from './features/purchasing/purchase-order/purchase-order';
import { LoginPage } from './features/auth/login/login';
import { authChildGuard, authGuard, unsavedChangesGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: 'documentation', loadComponent: () => import('./documentation/documentation').then(module => module.Documentation) },
  { path: 'documentation/:section/:article', loadComponent: () => import('./documentation/documentation').then(module => module.Documentation) },
  { path: 'welcome', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'start', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth/login', component: LoginPage },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard, unsavedChangesGuard],
    children: [
      { path: '', component: DashboardPage },
      ...getFeaturePageRoutes(),
      { path: 'purchase-order', component: PurchaseOrderPage, data: { pageId: 'purchase-order' } },
      { path: 'item-default-dimensions', redirectTo: 'items', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: '' },
];
