import type { LineTotalsConfig } from './document-window-config.model';

export type LineTotalKey = keyof LineTotalsConfig;

export type LineTotalExpressionConfig =
  | { kind: 'sum'; field: string }
  | { kind: 'difference'; left: LineTotalExpressionConfig; right: LineTotalExpressionConfig }
  | { kind: 'value'; value: number }
  | { kind: 'default' }
  | { formula: string; precision?: number };

export interface LineTotalsCalculationConfig {
  /** Override standard zero totals only when this document needs different defaults. */
  defaults?: Record<string, string>;
  totals: Partial<Record<LineTotalKey, LineTotalExpressionConfig>>;
  format?: {
    type?: 'number' | 'currency';
    /** Display precision only; backend amounts remain authoritative. Defaults to 2. */
    precision?: number;
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
