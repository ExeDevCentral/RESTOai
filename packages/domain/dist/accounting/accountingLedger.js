export class AccountingLedger {
    static entries = [];
    static recordEntry(params) {
        const totalDebit = params.lines.reduce((sum, l) => sum + l.debitCents, 0n);
        const totalCredit = params.lines.reduce((sum, l) => sum + l.creditCents, 0n);
        // Invariante de partida doble matemática estricta
        if (totalDebit !== totalCredit) {
            throw new Error(`UnbalancedJournalEntryError: Debits (${totalDebit}) must equal Credits (${totalCredit})`);
        }
        const entryId = `je-${crypto.randomUUID().slice(0, 8)}`;
        const entry = {
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
    static getEntries(organizationId) {
        return this.entries.filter(e => e.organizationId === organizationId);
    }
    static getTotalDebits(organizationId) {
        return this.getEntries(organizationId).reduce((sum, e) => sum + e.totalDebitCents, 0n);
    }
    static getTotalCredits(organizationId) {
        return this.getEntries(organizationId).reduce((sum, e) => sum + e.totalCreditCents, 0n);
    }
    static clear() {
        this.entries.length = 0;
    }
}
//# sourceMappingURL=accountingLedger.js.map