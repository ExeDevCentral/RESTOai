import { z } from 'zod';
export declare const OrganizationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    taxId: z.ZodString;
    legalName: z.ZodString;
    createdAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    taxId: string;
    legalName: string;
    createdAt?: Date | undefined;
}, {
    id: string;
    name: string;
    taxId: string;
    legalName: string;
    createdAt?: Date | undefined;
}>;
export type Organization = z.infer<typeof OrganizationSchema>;
export declare const LocationSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    name: z.ZodString;
    address: z.ZodString;
    isActive: z.ZodDefault<z.ZodBoolean>;
    createdAt: z.ZodOptional<z.ZodDate>;
}, "strip", z.ZodTypeAny, {
    id: string;
    organizationId: string;
    name: string;
    address: string;
    isActive: boolean;
    createdAt?: Date | undefined;
}, {
    id: string;
    organizationId: string;
    name: string;
    address: string;
    createdAt?: Date | undefined;
    isActive?: boolean | undefined;
}>;
export type Location = z.infer<typeof LocationSchema>;
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    fullName: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    fullName: string;
}, {
    id: string;
    email: string;
    fullName: string;
}>;
export type User = z.infer<typeof UserSchema>;
//# sourceMappingURL=tenancy.d.ts.map