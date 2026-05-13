import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { UniNestWordmark } from "@/components/brand/uninest-wordmark"
import { Camera } from "lucide-react"
import PhotoUploadClient from "./photo-upload-client"

export default async function CompletePhotoPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect("/home")
  }

  const role = user?.publicMetadata?.role
  if (role !== "landlord") {
    redirect("/home")
  }

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)

  const profile = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePhoto: true },
  })

  if (profile?.profilePhoto) {
    redirect("/landlord-dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <UniNestWordmark className="text-2xl" />
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#dc2626] text-white">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Upload your profile photo</h1>
              <p className="mt-1 text-sm text-slate-600">Landlords must add a profile photo before entering the dashboard.</p>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <PhotoUploadClient initialName={`${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || "Landlord"} />
        </div>
      </div>
    </div>
  )
}
