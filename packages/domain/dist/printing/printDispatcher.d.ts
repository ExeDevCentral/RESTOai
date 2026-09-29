import { PrintJob, PrintRoute, PrinterDefinition, DocType, PrintFormat } from './printTypes.js';
export declare class PrintDispatcher {
    private static printers;
    private static routes;
    private static jobQueue;
    static clearAll(): void;
    static registerPrinter(printer: PrinterDefinition): void;
    static getPrinter(id: string): PrinterDefinition | undefined;
    static listPrinters(tenantId: string, locationId: string): PrinterDefinition[];
    static setRoutes(routes: PrintRoute[]): void;
    static findRoutes(params: {
        tenantId: string;
        locationId: string;
        docType: DocType;
        station?: string;
    }): PrintRoute[];
    /**
     * Despacha un trabajo de impresión asegurando idempotencia y ruteo
     */
    static enqueueJob(params: {
        tenantId: string;
        locationId: string;
        docType: DocType;
        format: PrintFormat;
        payload: string;
        idempotencyKey: string;
        station?: string;
        openDrawer?: boolean;
    }): PrintJob[];
    static getJob(id: string): PrintJob | undefined;
    static getPendingJobs(printerId?: string): PrintJob[];
    static markJobStatus(jobId: string, status: 'PRINTED' | 'FAILED', error?: string): PrintJob | undefined;
}
//# sourceMappingURL=printDispatcher.d.ts.map