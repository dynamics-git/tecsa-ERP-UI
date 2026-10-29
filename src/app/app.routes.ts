import { VendorsPage } from './features/purchase-masters/vendors/vendors';
import { ItemsPage } from './features/purchase-masters/items/items';
import { UnitsOfMeasurePage } from './features/purchase-masters/units-of-measure/units-of-measure';
import { PaymentTermsPage } from './features/purchase-masters/payment-terms/payment-terms';
import { PaymentMethodsPage } from './features/purchase-masters/payment-methods/payment-methods';
import { CurrenciesPage } from './features/purchase-masters/currencies/currencies';
import { VendorPostingGroupsPage } from './features/purchase-masters/vendor-posting-groups/vendor-posting-groups';
import { GeneralBusinessPostingGroupsPage } from './features/purchase-masters/general-business-posting-groups/general-business-posting-groups';
import { GeneralProductPostingGroupsPage } from './features/purchase-masters/general-product-posting-groups/general-product-posting-groups';
import { VatBusinessPostingGroupsPage } from './features/purchase-masters/vat-business-posting-groups/vat-business-posting-groups';
import { VatProductPostingGroupsPage } from './features/purchase-masters/vat-product-posting-groups/vat-product-posting-groups';
import { InventoryPostingGroupsPage } from './features/purchase-masters/inventory-posting-groups/inventory-posting-groups';
import { ItemChargesPage } from './features/purchase-masters/item-charges/item-charges';
import { GlAccountsPage } from './features/purchase-masters/gl-accounts/gl-accounts';
import { LocationsPage } from './features/purchase-masters/locations/locations';
import { WarehouseZonesPage } from './features/purchase-masters/warehouse-zones/warehouse-zones';
import { WarehouseBinsPage } from './features/purchase-masters/warehouse-bins/warehouse-bins';
import { DimensionsPage } from './features/purchase-masters/dimensions/dimensions';
import { SourceCodesPage } from './features/purchase-masters/source-codes/source-codes';
import { ReasonCodesPage } from './features/purchase-masters/reason-codes/reason-codes';
import { GeneralPostingSetupPage } from './features/purchase-masters/general-posting-setup/general-posting-setup';
import { VatPostingSetupPage } from './features/purchase-masters/vat-posting-setup/vat-posting-setup';
import { InventoryPostingSetupPage } from './features/purchase-masters/inventory-posting-setup/inventory-posting-setup';
import { InventorySetupPage } from './features/purchase-masters/inventory-setup/inventory-setup';
import { GeneralLedgerSetupPage } from './features/purchase-masters/general-ledger-setup/general-ledger-setup';
import { SourceCodeSetupPage } from './features/purchase-masters/source-code-setup/source-code-setup';
import { AccountingPeriodsPage } from './features/purchase-masters/accounting-periods/accounting-periods';
import { DimensionCombinationsPage } from './features/purchase-masters/dimension-combinations/dimension-combinations';
import { NotificationRulesPage } from './features/administration/notification-rules/notification-rules';
import { Routes } from '@angular/router';
import { MainLayout } from './layout/main-layout/main-layout';
import { DashboardPage } from './features/dashboard/dashboard-page/dashboard-page';
import { PurchaseOrderPage } from './features/purchasing/purchase-order/purchase-order';
import { LoginPage } from './features/auth/login/login';
import { PlatformRedirect } from './features/auth/platform-redirect';
import { authChildGuard, authGuard, unsavedChangesGuard } from './core/guards/auth.guard';
import { NoSeriesPage } from './features/administration/no-series/no-series';
import { PurchaseRequisitionPage } from './features/purchasing/purchase-requisition/purchase-requisition';
import { PurchasesPayablesSetupPage } from './features/setup/purchases-payables-setup/purchases-payables-setup';
import { SalesReceivablesSetupPage } from './features/setup/sales-receivables-setup/sales-receivables-setup';

import { UsersPage } from './features/administration/security/users/users';
import { PermissionSetsPage } from './features/administration/security/permission-sets/permission-sets';
import { PageConfigurationPage } from './features/administration/security/page-configuration/page-configuration';

export const routes: Routes = [
  { path: 'welcome', component: PlatformRedirect },
  { path: 'start', component: PlatformRedirect, data:{registration:true} },
  { path: 'auth/login', component: LoginPage },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard, unsavedChangesGuard],
    children: [
      {path:'notification-rules',component:NotificationRulesPage,data:{pageId:'notification-rules'}},
      { path: '', component: DashboardPage },
      { path: 'vendors', component: VendorsPage, data: { pageId: 'vendors' } },
      { path: 'items', component: ItemsPage, data: { pageId: 'items' } },
      { path: 'units-of-measure', component: UnitsOfMeasurePage, data: { pageId: 'units-of-measure' } },
      { path: 'payment-terms', component: PaymentTermsPage, data: { pageId: 'payment-terms' } },
      { path: 'payment-methods', component: PaymentMethodsPage, data: { pageId: 'payment-methods' } },
      { path: 'currencies', component: CurrenciesPage, data: { pageId: 'currencies' } },
      { path: 'vendor-posting-groups', component: VendorPostingGroupsPage, data: { pageId: 'vendor-posting-groups' } },
      { path: 'general-business-posting-groups', component: GeneralBusinessPostingGroupsPage, data: { pageId: 'general-business-posting-groups' } },
      { path: 'general-product-posting-groups', component: GeneralProductPostingGroupsPage, data: { pageId: 'general-product-posting-groups' } },
      { path: 'vat-business-posting-groups', component: VatBusinessPostingGroupsPage, data: { pageId: 'vat-business-posting-groups' } },
      { path: 'vat-product-posting-groups', component: VatProductPostingGroupsPage, data: { pageId: 'vat-product-posting-groups' } },
      { path: 'inventory-posting-groups', component: InventoryPostingGroupsPage, data: { pageId: 'inventory-posting-groups' } },
      { path: 'item-charges', component: ItemChargesPage, data: { pageId: 'item-charges' } },
      { path: 'gl-accounts', component: GlAccountsPage, data: { pageId: 'gl-accounts' } },
      { path: 'locations', component: LocationsPage, data: { pageId: 'locations' } },
      { path: 'warehouse-zones', component: WarehouseZonesPage, data: { pageId: 'warehouse-zones' } },
      { path: 'warehouse-bins', component: WarehouseBinsPage, data: { pageId: 'warehouse-bins' } },
      { path: 'dimensions', component: DimensionsPage, data: { pageId: 'dimensions' } },
      { path: 'source-codes', component: SourceCodesPage, data: { pageId: 'source-codes' } },
      { path: 'reason-codes', component: ReasonCodesPage, data: { pageId: 'reason-codes' } },
      { path: 'general-posting-setup', component: GeneralPostingSetupPage, data: { pageId: 'general-posting-setup' } },
      { path: 'vat-posting-setup', component: VatPostingSetupPage, data: { pageId: 'vat-posting-setup' } },
      { path: 'inventory-posting-setup', component: InventoryPostingSetupPage, data: { pageId: 'inventory-posting-setup' } },
      { path: 'inventory-setup', component: InventorySetupPage, data: { pageId: 'inventory-setup' } },
      { path: 'general-ledger-setup', component: GeneralLedgerSetupPage, data: { pageId: 'general-ledger-setup' } },
      { path: 'source-code-setup', component: SourceCodeSetupPage, data: { pageId: 'source-code-setup' } },
      { path: 'accounting-periods', component: AccountingPeriodsPage, data: { pageId: 'accounting-periods' } },
      { path: 'dimension-combinations', component: DimensionCombinationsPage, data: { pageId: 'dimension-combinations' } },
      { path: 'item-default-dimensions', redirectTo: 'items', pathMatch: 'full' },
      { path: 'purchase-order', component: PurchaseOrderPage, data: { pageId: 'purchase-order' } },
      { path: 'no-series', component: NoSeriesPage, data: { pageId: 'no-series' } },
      { path:'users', component:UsersPage, data:{pageId:'users'} },
      { path:'permission-sets', component:PermissionSetsPage, data:{pageId:'permission-sets'} },
      { path:'page-configuration', component:PageConfigurationPage, data:{pageId:'page-configuration'} },
      { path: 'purchase-requisition', component: PurchaseRequisitionPage, data: { pageId: 'purchase-requisition' } },
      { path: 'purchases-payables-setup', component: PurchasesPayablesSetupPage, data: { pageId: 'purchases-payables-setup' } },
      { path: 'sales-receivables-setup', component: SalesReceivablesSetupPage, data: { pageId: 'sales-receivables-setup' } },
    ],
  },
  { path: '**', redirectTo: '' },
];
