import { describe, it, expect, beforeEach } from 'vitest';
import { AccountingLedger } from '../src/accounting/accountingLedger.js';

describe('Double-Entry Balance Invariants SUM(Debit) = SUM(Credit)', () => {
  beforeEach(() => {
    AccountingLedger.clear();
  });

  it('records balanced journal entries where debits equal credits to the exact cent', () => {
    const entry = AccountingLedger.recordEntry({
      organizationId: 'org-kobe-1',
      locationId: 'loc-centro',
      description: 'Venta de salón en efectivo con IVA 21%',
      lines: [
        { accountCode: '1.1.01', debitCents: 12100000n, creditCents: 0n, description: 'Ingreso a Caja' },
        { accountCode: '4.1.01', debitCents: 0n, creditCents: 10000000n, description: 'Venta neta' },
        { accountCode: '2.1.01', debitCents: 0n, creditCents: 2100000n, description: 'IVA Débito Fiscal' }
      ]
    });

    expect(entry.id).toBeDefined();
    expect(AccountingLedger.getTotalDebits('org-kobe-1')).toBe(12100000n);
    expect(AccountingLedger.getTotalCredits('org-kobe-1')).toBe(12100000n);
  });

  it('strictly rejects unbalanced journal entries (UnbalancedJournalEntryError)', () => {
    expect(() => {
      AccountingLedger.recordEntry({
        organizationId: 'org-kobe-1',
        locationId: 'loc-centro',
        description: 'Asiento desbalanceado fraudulento o erróneo',
        lines: [
          { accountCode: '1.1.01', debitCents: 10000000n, creditCents: 0n },
          { accountCode: '4.1.01', debitCents: 0n, creditCents: 9000000n } // Falta 1.000.000
        ]
      });
    }).toThrow('UnbalancedJournalEntryError');
  });
});
