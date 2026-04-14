import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const role = body?.role === "landlord" ? "landlord" : "student";

    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
        return new Response("Clerk user is missing an email address", { status: 400 });
    }

    const username = clerkUser.username ?? userId;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.upsert({
                where: { id: userId },
                create: {
                    id: userId,
                    username,
                    email,
                    phone: clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
                    role,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    profilePhoto: clerkUser.imageUrl,
                    isActive: true,
                },
                update: {
                    username,
                    email,
                    phone: clerkUser.phoneNumbers[0]?.phoneNumber ?? null,
                    role,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    profilePhoto: clerkUser.imageUrl,
                    isActive: true,
                },
            });

            if (role === "landlord") {
                await tx.landlordProfile.upsert({
                    where: { userId },
                    create: {
                        userId,
                    },
                    update: {},
                });
            }
        });

        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                role,
            },
        });

        return new Response("Profile saved successfully", { status: 200 });
    } catch (error) {
        console.error("Failed to save profile", error);
        return new Response("Failed to save profile", { status: 500 });
    }
}