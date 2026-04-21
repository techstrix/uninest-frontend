"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { toast } from "sonner"

export default function AdminSignInPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        redirect: false,
        identifier,
        password,
      })

      if (result?.error) {
        setError("Invalid credentials or inactive admin account.")
        return
      }

      toast.success("Signed in successfully")
      router.push("/")
    } catch {
      setError("Failed to sign in. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-[#1a3c34] text-white flex-col justify-between p-6 pl-10">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1a3c34] via-[#1a3c34] to-[#163830]" />
        <div className="absolute top-[-10%] right-[-20%] w-[500px] h-[500px] rounded-full bg-[#2a5c4a] opacity-40 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#2a5c4a] opacity-30 blur-[80px]" />
        <div className="absolute top-0 left-0 w-[250px] h-[80px] bg-[#3d7a65] opacity-50 blur-[40px] rounded-full" />

        <div className="relative z-10">
          <h1 className="text-2xl font-bold italic mb-12 tracking-tight">
            <span className="text-emerald-200">Uni</span>Nest
          </h1>
          <h2 className="text-[1.5rem] font-bold leading-[1.2] mb-3 max-w-[320px]">Admin dashboard access.</h2>
          <p className="text-[#a3c4b8] text-[13px] leading-relaxed max-w-[320px]">Use your admin username/email and password to continue.</p>
        </div>
      </div>

      <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6">
        <div className="max-w-[400px] w-full mx-auto">
          <h2 className="text-[24px] font-bold text-gray-900 mb-0.5">Welcome back</h2>
          <p className="text-gray-500 text-[14px] mb-4">Sign in to the admin dashboard</p>

          <form className="space-y-2.5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Email or username</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin@example.com"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34] focus:border-transparent"
              />
            </div>

            {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}

            <button
              type="submit"
              className="w-full h-10 bg-[#1a3c34] hover:bg-[#15332c] text-white font-semibold text-sm rounded-lg transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            Back to <Link href="/" className="text-gray-900 font-semibold underline underline-offset-2">admin landing</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
