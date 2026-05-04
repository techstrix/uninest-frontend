import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import PostListingClient from "./post-listing-client"
import PostListingPhoneGate from "@/components/post-listing-phone-gate"

export default async function PostListingPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect("/sign-in")
  }

  const role = user?.publicMetadata?.role
  if (role !== "landlord") {
    redirect("/home")
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId },
    select: {
      isLandlordVerified: true,
      verificationStatus: true,
    },
  })

  if (!landlordProfile) {
    redirect("/complete-profile")
  }

  if (!landlordProfile.isLandlordVerified) {
    redirect("/verify-success")
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  })

  const linkedPhone = dbUser?.phone ?? null

  if (!linkedPhone?.trim()) {
    return <PostListingPhoneGate phoneNumber={linkedPhone} />
  }

  return <PostListingClient />
}
