import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    const { userId } = await auth();

    if (!userId) {
        return new Response("Unauthorized", { status: 401 });
    }

    let body: { role?: unknown } = {};

    try {
        body = await req.json();
    } catch {
        return new Response("Invalid request body", { status: 400 });
    }

    const roleValue = typeof body.role === "string" ? body.role.trim().toLowerCase() : "student";
    const role = roleValue === "landlord" ? "landlord" : "student";
    
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
            
            console.log(role)
            if (role == "landlord") {
                console.log("role is landlord")
                await tx.landlordProfile.upsert({
                    where: { userId },
                    create: {
                        userId,
                        isPhoneVerified: false,
                        isIdVerified: false,
                        isLandlordVerified: false,
                        verificationStatus: "pending",
                    },
                    update: {
                        isPhoneVerified: false,
                        isIdVerified: false,
                        isLandlordVerified: false,
                        verificationStatus: "pending",
                    },
                });

                                console.log("Landlord profile upserted with userId:", userId)

            }
        });

        try {
            await client.users.updateUserMetadata(userId, {
                publicMetadata: {
                    role,
                },
            });
        } catch (metadataError) {
            console.error("Failed to update Clerk metadata", metadataError);
        }

        return new Response("Profile saved successfully", { status: 200 });
    } catch (error) {
        console.error("Failed to save profile", error);
        return new Response("Failed to save profile", { status: 500 });
    }
}
