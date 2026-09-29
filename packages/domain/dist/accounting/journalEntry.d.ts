import { Money } from '../primitives.js';
export interface JournalLine {
    accountCode: string;
    debitCents: Money;
    creditCents: Money;
    description?: string;
}
export interface JournalEntry {
    id: string;
    organizationId: string;
    locationId: string;
    description: string;
    lines: JournalLine[];
    totalDebitCents: Money;
    totalCreditCents: Money;
    timestamp: string;
}
//# sourceMappingURL=journalEntry.d.ts.map