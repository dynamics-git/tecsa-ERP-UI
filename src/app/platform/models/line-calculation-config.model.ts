import type { LineTotalsConfig } from './document-window-config.model';

export type LineTotalKey = keyof LineTotalsConfig;

export type LineTotalExpressionConfig =
  | { kind: 'sum'; field: string }
  | { kind: 'difference'; left: LineTotalExpressionConfig; right: LineTotalExpressionConfig }
  | { kind: 'value'; value: number }
  | { kind: 'default' }
  | { formula: string; precision?: number };

export interface LineTotalsCalculationConfig {
  defaults: LineTotalsConfig;
  totals: Partial<Record<LineTotalKey, LineTotalExpressionConfig>>;
  format?: {
    type?: 'number' | 'currency';
    currencyCodeHeaderField?: string;
    currencyCodeFallback?: string;
  };
}

export type CalculationValueSource = 'row' | 'header';

export interface CalculationRuleConfig {
  target: string;
  targetSource?: CalculationValueSource;
  formula: string;
  precision?: number;
}

export type CalculationConfig = CalculationRuleConfig[] | { rules: CalculationRuleConfig[] };
