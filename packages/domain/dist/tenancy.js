import { z } from 'zod';
export const OrganizationSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    taxId: z.string().min(1),
    legalName: z.string().min(1),
    createdAt: z.date().optional()
});
export const LocationSchema = z.object({
    id: z.string().uuid(),
    organizationId: z.string().uuid(),
    name: z.string().min(1),
    address: z.string().min(1),
    isActive: z.boolean().default(true),
    createdAt: z.date().optional()
});
export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    fullName: z.string().min(1)
});
//# sourceMappingURL=tenancy.js.map