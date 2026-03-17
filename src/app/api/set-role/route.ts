import { clerkClient,auth } from "@clerk/nextjs/server";
export async function POST(req: Request) {
    const { userId } = await auth();
    const { role } = await req.json();


    if(!userId){
        return new Response("Unauthorized", { status: 401 });

    }
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
        publicMetadata: {
            role
        }
    });
    return new Response("Role updated successfully", { status: 200 });

}