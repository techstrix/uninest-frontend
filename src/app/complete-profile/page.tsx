import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import CompleteProfileClient from "./complete-profile-client"

export default async function CompleteProfilePage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect("/sign-in")
  }

  const role = user?.publicMetadata?.role
  if (role === "student" || role === "landlord") {
    redirect(role === "landlord" ? "/verify-landlord-id" : "/home")
  }

  return <CompleteProfileClient />
}
