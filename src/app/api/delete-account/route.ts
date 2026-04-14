import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
    const { userId } = await auth();

    if (!userId) {
        return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
        await prisma.$transaction(async (tx) => {
            const dbUser = await tx.user.findUnique({
                where: { id: userId },
                select: { role: true },
            });

            if (dbUser?.role?.toLowerCase() === "landlord") {
                await tx.landlordProfile.deleteMany({
                    where: { userId },
                });
            }

            await tx.user.deleteMany({
                where: { id: userId },
            });
        });

        const client = await clerkClient();
        await client.users.deleteUser(userId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete account", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete account" },
            { status: 500 }
        );
    }
}