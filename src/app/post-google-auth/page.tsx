"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function PostAuth() {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded) return

    const role = user?.publicMetadata?.role

    if (!role) {
      router.push("/complete-profile")
    } else {
      router.push("/home")
    }
  }, [isLoaded, user])

  return <p>Loading...</p>
}