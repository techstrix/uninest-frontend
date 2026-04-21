"use client"

import { logout } from "@/app/actions/logout"
import { useRouter } from "next/navigation"

export function LogoutButton() {
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/sign-in")
  }

  return (
    <button
      onClick={handleLogout}
      className="mt-6 w-full rounded-lg bg-[#184f43] px-4 py-2 text-white font-medium hover:bg-[#133a32] transition-colors"
    >
      Logout
    </button>
  )
}
