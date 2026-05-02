import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import SignUpClient from "./sign-up-client"

export default async function SignUpPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (userId) {
    const role = user?.publicMetadata?.role
    if (role === "landlord") redirect("/landlord-dashboard")
    if (role === "student") redirect("/home")
    redirect("/complete-profile")
  }

  return <SignUpClient />
}
