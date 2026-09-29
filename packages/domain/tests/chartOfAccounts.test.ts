import { describe, it, expect } from 'vitest';
import { ChartOfAccounts } from '../src/accounting/chartOfAccounts.js';

describe('Chart of Accounts Invariants', () => {
  it('initializes standard gastronomic chart of accounts with valid classification', () => {
    const chart = new ChartOfAccounts('org-kobe-1');

    const caja = chart.getAccount('1.1.01');
    expect(caja).toBeDefined();
    expect(caja!.name).toBe('Caja Efectivo Salón');
    expect(caja!.type).toBe('ASSET');

    const ventas = chart.getAccount('4.1.01');
    expect(ventas).toBeDefined();
    expect(ventas!.type).toBe('REVENUE');

    const ivaDebito = chart.getAccount('2.1.01');
    expect(ivaDebito).toBeDefined();
    expect(ivaDebito!.type).toBe('LIABILITY');
  });
});
