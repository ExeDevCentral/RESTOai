import { z } from 'zod';
export const OrderStateSchema = z.enum([
    'DRAFT',
    'CONFIRMED',
    'IN_PREPARATION',
    'READY',
    'DELIVERED',
    'CANCELLED',
    'CLOSED'
]);
//# sourceMappingURL=orderTypes.js.map