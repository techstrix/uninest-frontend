import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import VerifySuccessClient from "./verify-success-client"
import { prisma } from "@/lib/prisma"

export default async function VerifySuccessPage() {
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

  return <VerifySuccessClient />
}
