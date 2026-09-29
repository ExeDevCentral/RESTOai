import { JournalEntry, JournalLine } from './journalEntry.js';
import { Money } from '../primitives.js';

export interface RecordEntryParams {
  organizationId: string;
  locationId: string;
  description: string;
  lines: JournalLine[];
}

export class AccountingLedger {
  private static readonly entries: JournalEntry[] = [];

  static recordEntry(params: RecordEntryParams): JournalEntry {
    const totalDebit = params.lines.reduce((sum, l) => sum + l.debitCents, 0n);
    const totalCredit = params.lines.reduce((sum, l) => sum + l.creditCents, 0n);

    // Invariante de partida doble matemática estricta
    if (totalDebit !== totalCredit) {
      throw new Error(
        `UnbalancedJournalEntryError: Debits (${totalDebit}) must equal Credits (${totalCredit})`
      );
    }

    const entryId = `je-${crypto.randomUUID().slice(0, 8)}`;
    const entry: JournalEntry = {
      id: entryId,
      ...params,
      totalDebitCents: totalDebit,
      totalCreditCents: totalCredit,
      timestamp: new Date().toISOString()
    };

    // Asiento inmutable
    Object.freeze(entry);
    this.entries.push(entry);
    return entry;
  }

  static getEntries(organizationId: string): readonly JournalEntry[] {
    return this.entries.filter(e => e.organizationId === organizationId);
  }

  static getTotalDebits(organizationId: string): Money {
    return this.getEntries(organizationId).reduce((sum, e) => sum + e.totalDebitCents, 0n);
  }

  static getTotalCredits(organizationId: string): Money {
    return this.getEntries(organizationId).reduce((sum, e) => sum + e.totalCreditCents, 0n);
  }

  static clear() {
    this.entries.length = 0;
  }
}
