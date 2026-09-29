import { Account } from './accountTypes.js';
export declare class ChartOfAccounts {
    private readonly accounts;
    readonly organizationId: string;
    constructor(organizationId: string);
    private seedGastronomicChart;
    getAccount(code: string): Account | undefined;
}
//# sourceMappingURL=chartOfAccounts.d.ts.map