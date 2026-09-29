export class PrintDispatcher {
    static printers = new Map();
    static routes = [];
    static jobQueue = [];
    static clearAll() {
        this.printers.clear();
        this.routes = [];
        this.jobQueue = [];
    }
    static registerPrinter(printer) {
        this.printers.set(printer.id, printer);
    }
    static getPrinter(id) {
        return this.printers.get(id);
    }
    static listPrinters(tenantId, locationId) {
        return Array.from(this.printers.values()).filter(p => p.tenantId === tenantId && p.locationId === locationId);
    }
    static setRoutes(routes) {
        this.routes = [...routes];
    }
    static findRoutes(params) {
        return this.routes
            .filter(r => r.tenantId === params.tenantId &&
            r.locationId === params.locationId &&
            r.docType === params.docType &&
            (!params.station || !r.station || r.station === params.station))
            .sort((a, b) => b.priority - a.priority);
    }
    /**
     * Despacha un trabajo de impresión asegurando idempotencia y ruteo
     */
    static enqueueJob(params) {
        // 1. Verificar si ya existe job con esta idempotencyKey
        const existing = this.jobQueue.filter(j => j.idempotencyKey.startsWith(params.idempotencyKey));
        if (existing.length > 0) {
            return existing;
        }
        // 2. Buscar rutas configuradas
        const matchedRoutes = this.findRoutes({
            tenantId: params.tenantId,
            locationId: params.locationId,
            docType: params.docType,
            station: params.station
        });
        const targetPrinterIds = matchedRoutes.length > 0
            ? matchedRoutes.map(r => r.printerId)
            : Array.from(this.printers.values())
                .filter(p => p.tenantId === params.tenantId && p.locationId === params.locationId)
                .slice(0, 1)
                .map(p => p.id);
        const jobsCreated = [];
        for (const printerId of targetPrinterIds) {
            const route = matchedRoutes.find(r => r.printerId === printerId);
            const copies = route?.copies ?? 1;
            const job = {
                id: `job-${crypto.randomUUID().slice(0, 8)}`,
                tenantId: params.tenantId,
                locationId: params.locationId,
                printerId,
                docType: params.docType,
                format: params.format,
                payload: params.payload,
                copies,
                openDrawer: Boolean(params.openDrawer),
                status: 'QUEUED',
                attempts: 0,
                maxAttempts: 5,
                idempotencyKey: `${params.idempotencyKey}:${printerId}`,
                createdAt: new Date().toISOString()
            };
            this.jobQueue.push(job);
            jobsCreated.push(job);
        }
        return jobsCreated;
    }
    static getJob(id) {
        return this.jobQueue.find(j => j.id === id);
    }
    static getPendingJobs(printerId) {
        return this.jobQueue.filter(j => (j.status === 'QUEUED' || j.status === 'SENDING') && (!printerId || j.printerId === printerId));
    }
    static markJobStatus(jobId, status, error) {
        const job = this.jobQueue.find(j => j.id === jobId);
        if (!job)
            return undefined;
        job.attempts += 1;
        if (status === 'PRINTED') {
            job.status = 'PRINTED';
            job.printedAt = new Date().toISOString();
            job.error = undefined;
        }
        else {
            if (job.attempts >= job.maxAttempts) {
                job.status = 'FAILED';
            }
            else {
                job.status = 'QUEUED'; // Reintento con backoff
            }
            job.error = error;
        }
        return job;
    }
}
//# sourceMappingURL=printDispatcher.js.map