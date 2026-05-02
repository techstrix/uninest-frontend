import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import VerifyLandlordIdClient from "./verify-landlord-id-client"

export default async function VerifyLandlordIdPage() {
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
      id: true,
      verificationStatus: true,
    },
  })

  if (!landlordProfile) {
    redirect("/complete-profile")
  }

  if (landlordProfile.verificationStatus === "verified") {
    redirect("/landlord-dashboard")
  }

  return <VerifyLandlordIdClient />
}
