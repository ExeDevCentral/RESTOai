import { describe, it, expect, beforeEach } from 'vitest';
import { JournalAutomator } from '../src/accounting/journalAutomator.js';
import { AccountingLedger } from '../src/accounting/accountingLedger.js';

describe('Automatic Journal Entries Generation Invariants', () => {
  beforeEach(() => {
    AccountingLedger.clear();
  });

  it('automatically posts balanced journal entry for cash sales with Argentine VAT (21%)', () => {
    const totalOrderCents = 12100000n; // $121.000,00 total

    const entry = JournalAutomator.postSale({
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      orderId: 'ord-sale-77',
      totalAmountCents: totalOrderCents,
      paymentMethod: 'CASH',
      vatRatePercent: 21
    });

    expect(entry.totalDebitCents).toBe(12100000n);
    expect(entry.totalCreditCents).toBe(12100000n);

    // 121.000 / 1.21 = 100.000 neto, 21.000 IVA
    const netLine = entry.lines.find(l => l.accountCode === '4.1.01');
    const vatLine = entry.lines.find(l => l.accountCode === '2.1.01');
    const cashLine = entry.lines.find(l => l.accountCode === '1.1.01');

    expect(cashLine?.debitCents).toBe(12100000n);
    expect(netLine?.creditCents).toBe(10000000n);
    expect(vatLine?.creditCents).toBe(2100000n);
  });

  it('automatically posts balanced journal entry for kitchen waste (merma)', () => {
    const entry = JournalAutomator.postWaste({
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      costCents: 1500000n, // $15.000 de costo descartado
      reason: 'KITCHEN_ACCIDENT',
      referenceId: 'lot-carne-01'
    });

    expect(entry.totalDebitCents).toBe(1500000n);
    expect(entry.totalCreditCents).toBe(1500000n);

    const expenseLine = entry.lines.find(l => l.accountCode === '5.1.02');
    const stockLine = entry.lines.find(l => l.accountCode === '1.1.03');

    expect(expenseLine?.debitCents).toBe(1500000n);
    expect(stockLine?.creditCents).toBe(1500000n);
  });
});
