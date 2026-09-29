import { JournalEntry, JournalLine } from './journalEntry.js';
import { Money } from '../primitives.js';
export interface RecordEntryParams {
    organizationId: string;
    locationId: string;
    description: string;
    lines: JournalLine[];
}
export declare class AccountingLedger {
    private static readonly entries;
    static recordEntry(params: RecordEntryParams): JournalEntry;
    static getEntries(organizationId: string): readonly JournalEntry[];
    static getTotalDebits(organizationId: string): Money;
    static getTotalCredits(organizationId: string): Money;
    static clear(): void;
}
//# sourceMappingURL=accountingLedger.d.ts.map