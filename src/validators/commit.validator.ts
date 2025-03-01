import { z } from "zod";

export const createcommitSchema = z.object({
    body: z.object({
        videoId: z.number().int().positive(),
        branchId: z.number().int().positive(),
        description: z.string().min(1, "Description is required"),
        changes: z.array(z.any()).nonempty("Changes array cannot be empty"),
    })
});