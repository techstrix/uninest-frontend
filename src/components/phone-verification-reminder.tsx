"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Phone } from "lucide-react"
import PhoneVerificationModal from "./phone-verification-modal"

type PhoneVerificationReminderProps = {
  phoneNumber?: string | null
}

export default function PhoneVerificationReminder({ phoneNumber }: PhoneVerificationReminderProps) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const isLinked = Boolean(phoneNumber?.trim())

  if (isLinked) {
    return null
  }

  return (
    <>
      <div className="rounded-2xl border border-[#e6dfd2] bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-700">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">You have not yet linked a phone number.</p>
              <p className="text-sm text-slate-500">Add one to keep your account ready for listing access and verification.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full border border-[#1f5a48] bg-[#f4faf8] px-4 text-sm font-semibold text-[#1f5a48] transition hover:bg-[#eaf4ef]"
          >
            <Phone className="h-4 w-4" />
            Link phone
          </button>
        </div>
      </div>

      <PhoneVerificationModal
        open={open}
        allowClose
        title="Link your phone"
        description="Verify your number with an SMS code."
        phoneLabel="We’ll send an SMS code to the number you add here."
        initialPhoneNumber={phoneNumber}
        onClose={() => setOpen(false)}
        onVerified={() => {
          setOpen(false)
          router.refresh()
        }}
      />
    </>
  )
}
