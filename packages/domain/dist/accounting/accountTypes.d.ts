export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
export interface Account {
    code: string;
    organizationId: string;
    name: string;
    type: AccountType;
    isActive: boolean;
}
//# sourceMappingURL=accountTypes.d.ts.map