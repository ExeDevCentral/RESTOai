import { Order, OrderItem } from './orderTypes.js';
export interface IngestOrderParams {
    clientOrderId: string;
    organizationId: string;
    locationId: string;
    tableNumber: string;
    actorId: string;
    items: OrderItem[];
}
export interface IngestOrderResult {
    order: Order;
    isDuplicate: boolean;
}
export declare class IdempotentOrderIngestor {
    private static readonly clientOrderMap;
    static ingest(params: IngestOrderParams): IngestOrderResult;
    static clearCache(): void;
}
//# sourceMappingURL=idempotentOrderIngestor.d.ts.map