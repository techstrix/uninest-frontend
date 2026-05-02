import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import HomeClient from "./home-client"

export default async function HomePage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect("/sign-in")
  }

  const role = user?.publicMetadata?.role
  if (role === "landlord") {
    redirect("/landlord-dashboard")
  }

  if (role !== "student") {
    redirect("/complete-profile")
  }

  return <HomeClient />
}
