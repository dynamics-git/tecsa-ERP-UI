import { Injectable } from '@angular/core';
import { LineTotalsConfig } from '../models/document-window-config.model';
import {
  CalculationConfig,
  CalculationRuleConfig,
  LineTotalExpressionConfig,
  LineTotalsCalculationConfig,
} from '../models/line-calculation-config.model';

@Injectable({
  providedIn: 'root'
})
export class LineCalculationService {
  private formulaTokens: string[] = [];
  private formulaTokenIndex = 0;
  private activeTotals?: Record<string, number>;

  readonly emptyTotals: LineTotalsConfig = {
    subtotal: '0.00',
    sst: '0.00',
    total: '0.00',
    difference: '0.00'
  };

  applyCalculations(
    row: Record<string, unknown>,
    config: CalculationConfig | undefined,
    headerData?: Record<string, unknown>
  ): string[] {
    const rules = Array.isArray(config) ? config : (config?.rules ?? []);
    const changedFields: string[] = [];

    for (const rule of rules) {
      const target = this.toText(rule.target).trim();
      if (!target) {
        continue;
      }

      const value = this.round(this.evaluateFormula(rule.formula, row, headerData), rule.precision);
      const targetRecord = rule.targetSource === 'header' ? headerData : row;
      if (!targetRecord) {
        continue;
      }

      this.assignIfChanged(targetRecord, target, value, changedFields);
    }

    return changedFields;
  }

  calculateLineTotals(
    rows: Record<string, unknown>[],
    config: LineTotalsCalculationConfig,
    headerData?: Record<string, unknown>
  ): LineTotalsConfig {
    const defaults = { ...this.emptyTotals, ...config.defaults };
    const result: LineTotalsConfig = { ...this.emptyTotals, ...defaults };
    const values: Record<string, number> = Object.create(null);
    const visiting = new Set<string>();
    const resolved = new Set<string>();
    const previousTotals = this.activeTotals;
    this.activeTotals = values;
    const resolve = (key: string): void => {
      if (!/^[A-Za-z_]\w*$/.test(key) || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Invalid total name: ' + key);
      if (resolved.has(key)) return;
      if (visiting.has(key)) throw new Error('Circular total dependency: ' + key);
      if (!Object.hasOwn(config.totals, key) && !Object.hasOwn(defaults, key))
        throw new Error('Unknown total: ' + key);
      visiting.add(key);
      const expression = config.totals[key];
      // Resolve named totals before parsing so recursive evaluation cannot overwrite parser state.
      const formulas = this.totalFormulas(expression);
      for (const formula of formulas) {
        for (const match of formula.matchAll(/\btotals\.([A-Za-z_][A-Za-z0-9_]*)/g)) resolve(match[1]);
      }
      const value = !expression || 'kind' in expression && expression.kind === 'default'
        ? this.toNumber(defaults[key]) ?? 0
        : 'formula' in expression
          ? this.round(this.evaluateFormula(expression.formula, {}, headerData, rows), expression.precision)
          : this.evaluate(rows, expression, headerData);
      values[key] = value;
      if (expression && !('kind' in expression && expression.kind === 'default'))
        result[key] = this.format(value, config, headerData);
      visiting.delete(key);
      resolved.add(key);
    };
    try {
      for (const key of Object.keys(config.totals)) resolve(key);
      return result;
    } finally {
      this.activeTotals = previousTotals;
    }
  }

  private totalFormulas(expression?: LineTotalExpressionConfig): string[] {
    if (!expression) return [];
    if ('formula' in expression) return [expression.formula];
    return expression.kind === 'difference'
      ? [...this.totalFormulas(expression.left), ...this.totalFormulas(expression.right)] : [];
  }

  private assignIfChanged(
    row: Record<string, unknown>,
    field: string,
    value: number,
    changedFields: string[]
  ): void {
    if (this.toNumber(row[field]) === value) {
      return;
    }

    row[field] = value;
    changedFields.push(field);
  }

  private evaluate(rows: Record<string, unknown>[], expression: LineTotalExpressionConfig, headerData?: Record<string, unknown>): number {
    if ('formula' in expression) {
      return this.evaluateFormula(expression.formula, {}, headerData, rows);
    }

    switch (expression.kind) {
      case 'sum':
        return rows.reduce((sum, row) => sum + (this.toNumber(row[expression.field]) ?? 0), 0);
      case 'difference':
        return this.evaluate(rows, expression.left, headerData) - this.evaluate(rows, expression.right, headerData);
      case 'value':
        return expression.value;
      case 'default':
        return 0;
    }
  }

  private evaluateFormula(
    formula: string,
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>,
    rows?: Record<string, unknown>[]
  ): number {
    this.formulaTokens = this.tokenizeFormula(formula);
    this.formulaTokenIndex = 0;
    return this.parseAddSubtract(row, headerData, rows);
  }

  private tokenizeFormula(formula: string): string[] {
    const tokens: string[] = [];
    const pattern = /\s*([A-Za-z_][A-Za-z0-9_.]*|\d+(?:\.\d+)?|[()+\-*/%,])\s*/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(formula)) !== null) {
      tokens.push(match[1]);
    }

    return tokens;
  }

  private parseAddSubtract(
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>,
    rows?: Record<string, unknown>[]
  ): number {
    let value = this.parseMultiplyDivide(row, headerData, rows);

    while (this.peekToken() === '+' || this.peekToken() === '-') {
      const operator = this.nextToken();
      const nextValue = this.parseMultiplyDivide(row, headerData, rows);
      value = operator === '+' ? value + nextValue : value - nextValue;
    }

    return value;
  }

  private parseMultiplyDivide(
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>,
    rows?: Record<string, unknown>[]
  ): number {
    let value = this.parseUnary(row, headerData, rows);

    while (this.peekToken() === '*' || this.peekToken() === '/') {
      const operator = this.nextToken();
      const nextValue = this.parseUnary(row, headerData, rows);
      value = operator === '*'
        ? value * nextValue
        : nextValue === 0
          ? value
          : value / nextValue;
    }

    return value;
  }

  private parseUnary(
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>,
    rows?: Record<string, unknown>[]
  ): number {
    if (this.peekToken() === '-') {
      this.nextToken();
      return -this.parseUnary(row, headerData, rows);
    }

    const value = this.parsePrimary(row, headerData, rows);
    if (this.peekToken() === '%') {
      this.nextToken();
      return value / 100;
    }

    return value;
  }

  private parsePrimary(
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>,
    rows?: Record<string, unknown>[]
  ): number {
    const token = this.nextToken();
    if (!token) {
      return 0;
    }

    if (token === '(') {
      const value = this.parseAddSubtract(row, headerData, rows);
      if (this.peekToken() === ')') {
        this.nextToken();
      }
      return value;
    }

    const numericValue = Number(token);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    if (token === 'sum' && this.peekToken() === '(') {
      this.nextToken();
      const field = this.nextToken();
      if (this.peekToken() === ')') {
        this.nextToken();
      }
      return (rows ?? []).reduce((total, item) => total + (this.toNumber(item[field]) ?? 0), 0);
    }

    return this.resolveFormulaField(token, row, headerData);
  }

  private resolveFormulaField(
    token: string,
    row: Record<string, unknown>,
    headerData?: Record<string, unknown>
  ): number {
    if (token.startsWith('totals.')) return this.activeTotals?.[token.slice('totals.'.length)] ?? 0;

    if (token.startsWith('header.')) {
      return this.toNumber(headerData?.[token.slice('header.'.length)]) ?? 0;
    }

    if (token.startsWith('row.')) {
      return this.toNumber(row[token.slice('row.'.length)]) ?? 0;
    }

    return this.toNumber(row[token]) ?? 0;
  }

  private peekToken(): string | undefined {
    return this.formulaTokens[this.formulaTokenIndex];
  }

  private nextToken(): string {
    return this.formulaTokens[this.formulaTokenIndex++] ?? '';
  }

  private round(value: number, precision = 2): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }

  private format(
    value: number,
    config: LineTotalsCalculationConfig,
    headerData?: Record<string, unknown>
  ): string {
    const formatted = this.formatNumber(value, config.format?.precision);
    if (config.format?.type !== 'currency') {
      return formatted;
    }

    const currencyCode = this.toText(
      config.format.currencyCodeHeaderField
        ? headerData?.[config.format.currencyCodeHeaderField]
        : undefined
    ).trim() || this.toText(config.format.currencyCodeFallback).trim();

    return currencyCode ? `${currencyCode} ${formatted}` : formatted;
  }

  private formatNumber(value: number, precision = 2): string {
    const digits = Number.isFinite(precision) ? Math.max(0, Math.min(12, Math.trunc(precision))) : 2;
    return Number.isFinite(value) ? value.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }) : '0.00';
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.replace(/,/g, '').trim();
      if (!normalized) {
        return null;
      }

      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private toText(value: unknown): string {
    return value === null || value === undefined ? '' : String(value);
  }
}
