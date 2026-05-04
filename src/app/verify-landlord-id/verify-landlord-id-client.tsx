"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldCheck, Loader2, ArrowRight } from "lucide-react"
import { UniNestWordmark } from "@/components/brand/uninest-wordmark"

export default function VerifyLandlordIdClient() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  useEffect(() => {
    document.title = "Verify landlord ID | UniNest"
  }, [])

  const handleContinue = async () => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/didit/session", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || "Failed to start verification.")
      }

      if (!data?.url) {
        throw new Error("Didit did not return a verification URL.")
      }

      router.push(data.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start verification.")
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
          <UniNestWordmark className="mb-12 text-2xl" />

          <h2 className="text-[1.5rem] font-bold leading-[1.2] mb-3 max-w-[320px]">
            Continue to identity verification.
          </h2>
          <p className="text-[#a3c4b8] text-[13px] leading-relaxed max-w-[320px]">
            We use Didit to securely verify landlords before they can publish listings.
          </p>
        </div>

        <div className="relative z-10 space-y-2">
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4] leading-snug">Secure landlord onboarding</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4]">Approval callback returns you here</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <p className="text-[12px] text-[#c5ddd4]">Verification result controls next step</p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-[55%] bg-white flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-6">
        <div className="max-w-[460px] w-full mx-auto">
          <div className="mb-6 flex items-center gap-2 text-[#184f43]">
            <ShieldCheck className="h-5 w-5" />
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">Landlord Verification</p>
          </div>

          <h2 className="text-[24px] font-bold text-gray-900 mb-0.5">Continue to ID verification</h2>
          <p className="text-gray-500 text-[14px] mb-6">
            You’ll be redirected to Didit to complete verification. When finished, you’ll return here automatically.
          </p>

          <div className="space-y-4 rounded-xl border border-gray-200 bg-[#f7f7f9] p-5">
            <div className="rounded-lg border border-[#dbe7e2] bg-white p-4 text-sm text-gray-700">
              <p className="font-semibold text-[#111827]">What happens next</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-gray-600">
                <li>Open Didit’s secure verification flow.</li>
                <li>Approve the callback and wait for the result.</li>
                <li>Successful landlords continue to the next stage.</li>
              </ul>
            </div>

            {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}

            <button
              type="button"
              onClick={handleContinue}
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#184f43] text-sm font-semibold text-white transition hover:bg-[#153c34] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {isLoading ? "Opening verification..." : "Continue to verification"}
            </button>

            <p className="text-center text-sm text-gray-500">
              <Link href="/complete-profile" className="text-gray-900 font-semibold underline underline-offset-2">
                Back to profile setup
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
