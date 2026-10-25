import * as notificationRules from './administration/notification-rules/notification-rules';
import * as dimensionValueCombinations from './purchase-masters/dimension-value-combinations/dimension-value-combinations';
import * as glAccountDefaultDimensions from './purchase-masters/gl-account-default-dimensions/gl-account-default-dimensions';
import * as defaultDimensionPriorities from './purchase-masters/default-dimension-priorities/default-dimension-priorities';
import * as dimensionValues from './purchase-masters/dimension-values/dimension-values';
import * as currencyExchangeRates from './purchase-masters/currency-exchange-rates/currency-exchange-rates';
import * as vendorDefaultDimensions from './purchase-masters/vendor-default-dimensions/vendor-default-dimensions';
import * as itemUnitsOfMeasure from './purchase-masters/item-units-of-measure/item-units-of-measure';
import * as vendors from './purchase-masters/vendors/vendors';
import * as items from './purchase-masters/items/items';
import * as unitsOfMeasure from './purchase-masters/units-of-measure/units-of-measure';
import * as paymentTerms from './purchase-masters/payment-terms/payment-terms';
import * as paymentMethods from './purchase-masters/payment-methods/payment-methods';
import * as currencies from './purchase-masters/currencies/currencies';
import * as vendorPostingGroups from './purchase-masters/vendor-posting-groups/vendor-posting-groups';
import * as generalBusinessPostingGroups from './purchase-masters/general-business-posting-groups/general-business-posting-groups';
import * as generalProductPostingGroups from './purchase-masters/general-product-posting-groups/general-product-posting-groups';
import * as vatBusinessPostingGroups from './purchase-masters/vat-business-posting-groups/vat-business-posting-groups';
import * as vatProductPostingGroups from './purchase-masters/vat-product-posting-groups/vat-product-posting-groups';
import * as inventoryPostingGroups from './purchase-masters/inventory-posting-groups/inventory-posting-groups';
import * as itemCharges from './purchase-masters/item-charges/item-charges';
import * as glAccounts from './purchase-masters/gl-accounts/gl-accounts';
import * as locations from './purchase-masters/locations/locations';
import * as warehouseZones from './purchase-masters/warehouse-zones/warehouse-zones';
import * as warehouseBins from './purchase-masters/warehouse-bins/warehouse-bins';
import * as dimensions from './purchase-masters/dimensions/dimensions';
import * as sourceCodes from './purchase-masters/source-codes/source-codes';
import * as reasonCodes from './purchase-masters/reason-codes/reason-codes';
import * as generalPostingSetup from './purchase-masters/general-posting-setup/general-posting-setup';
import * as vatPostingSetup from './purchase-masters/vat-posting-setup/vat-posting-setup';
import * as inventoryPostingSetup from './purchase-masters/inventory-posting-setup/inventory-posting-setup';
import * as inventorySetup from './purchase-masters/inventory-setup/inventory-setup';
import * as generalLedgerSetup from './purchase-masters/general-ledger-setup/general-ledger-setup';
import * as sourceCodeSetup from './purchase-masters/source-code-setup/source-code-setup';
import * as accountingPeriods from './purchase-masters/accounting-periods/accounting-periods';
import * as dimensionCombinations from './purchase-masters/dimension-combinations/dimension-combinations';
import * as itemDefaultDimensions from './purchase-masters/item-default-dimensions/item-default-dimensions';
import * as purchaseOrder from './purchasing/purchase-order/purchase-order';
import * as noSeries from './administration/no-series/no-series';
import * as purchaseRequisition from './purchasing/purchase-requisition/purchase-requisition';
import * as purchasesPayablesSetup from './setup/purchases-payables-setup/purchases-payables-setup';
import * as salesReceivablesSetup from './setup/sales-receivables-setup/sales-receivables-setup';
import { RunModalConfigModule } from '../platform/public-api';

export const runModalPageModules: RunModalConfigModule[] = [
  dimensionValueCombinations,
  glAccountDefaultDimensions,
  defaultDimensionPriorities,
  dimensionValues,
  currencyExchangeRates,
  vendorDefaultDimensions,
  itemUnitsOfMeasure,
  vendors,
  items,
  unitsOfMeasure,
  paymentTerms,
  paymentMethods,
  currencies,
  vendorPostingGroups,
  generalBusinessPostingGroups,
  generalProductPostingGroups,
  vatBusinessPostingGroups,
  vatProductPostingGroups,
  inventoryPostingGroups,
  itemCharges,
  glAccounts,
  locations,
  warehouseZones,
  warehouseBins,
  dimensions,
  sourceCodes,
  reasonCodes,
  generalPostingSetup,
  vatPostingSetup,
  inventoryPostingSetup,
  inventorySetup,
  generalLedgerSetup,
  sourceCodeSetup,
  accountingPeriods,
  dimensionCombinations,
  itemDefaultDimensions,
  purchaseOrder,
  noSeries,
  purchaseRequisition,
  purchasesPayablesSetup,
  salesReceivablesSetup,
  notificationRules,
];
