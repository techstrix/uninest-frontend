"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { CheckCircle2, RefreshCw } from "lucide-react"

type StatusResponse = {
  isLandlordVerified: boolean
  status: string
}

export default function VerifySuccessClient() {
  const searchParams = useSearchParams()
  const initialStatus = String(searchParams.get("status") ?? "pending").toLowerCase()
  const initialVerified = initialStatus === "approved" || initialStatus === "success" || initialStatus === "verified"

  const [state, setState] = useState<StatusResponse>({
    isLandlordVerified: initialVerified,
    status: initialStatus,
  })

  useEffect(() => {
    if (initialVerified) {
      return
    }

    let active = true

    const loadStatus = async () => {
      try {
        const response = await fetch("/api/didit/status", { cache: "no-store" })
        if (!response.ok) return

        const data = (await response.json()) as StatusResponse
        if (active) {
          setState(data)
        }
      } catch {
        // keep polling until the webhook updates the DB
      }
    }

    loadStatus()
    const interval = window.setInterval(loadStatus, 7000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [initialVerified])

  const success = state.isLandlordVerified || ["approved", "success", "verified"].includes(state.status.toLowerCase())

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 py-10">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#184f43] px-6 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">Verification Status</p>
          <h1 className="mt-2 text-3xl font-bold">{success ? "Verification successful" : "Verification pending"}</h1>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className={`rounded-xl border p-4 ${success ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className={`mt-0.5 h-5 w-5 ${success ? "text-emerald-600" : "text-amber-600"}`} />
              <div>
                <p className="font-semibold text-[#111827]">{success ? "You can continue to the next stage." : "We are still checking your verification."}</p>
                <p className="mt-1 text-sm text-gray-700">
                  {success ? "Your ID was successfully verified." : "This page checks the database every few seconds until Didit updates your status."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {success ? (
              <Link href="/landlord-dashboard" className="inline-flex items-center justify-center rounded-lg bg-[#184f43] px-4 py-3 text-sm font-semibold text-white">
                Go to landlord dashboard
              </Link>
            ) : (
              <Link href="/verify-landlord-id" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#184f43] px-4 py-3 text-sm font-semibold text-white">
                <RefreshCw className="h-4 w-4" />
                Redo identification
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
