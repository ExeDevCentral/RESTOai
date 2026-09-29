import { z } from 'zod';
export const KitchenTicketStateSchema = z.enum([
    'QUEUED',
    'PREPARING',
    'READY',
    'CANCELLED'
]);
//# sourceMappingURL=kitchenTicket.js.map