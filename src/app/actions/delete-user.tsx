"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

export async function deleteUserAction(userId: string) {
    try {
        const clerk = await clerkClient();
        
        
        await clerk.users.deleteUser(userId);
        
        revalidatePath("/");
        return { success: true };
    } catch (error) {
        console.error("Deletion Error:", error);
        return { success: false, error: "Failed to delete account" };
    }
}