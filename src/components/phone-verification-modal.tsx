"use client"

import { useEffect, useState } from "react"
import { Loader2, Phone, ShieldCheck, X } from "lucide-react"
import { toast } from "sonner"
import { checkOTP, linkVerifiedPhone, sendSMS_OTP } from "@/app/actions/phone-verification"

type PhoneVerificationModalProps = {
  open: boolean
  allowClose?: boolean
  title: string
  description: string
  phoneLabel: string
  initialPhoneNumber?: string | null
  onClose?: () => void
  onVerified?: (phoneNumber: string) => void
}

export default function PhoneVerificationModal({
  open,
  allowClose = true,
  title,
  description,
  phoneLabel,
  initialPhoneNumber = "",
  onClose,
  onVerified,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"phone" | "code">("phone")
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber ?? "")
  const [code, setCode] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [message, setMessage] = useState("")

  useEffect(() => {
    if (open) {
      setPhoneNumber(initialPhoneNumber ?? "")
      setCode("")
      setStep(initialPhoneNumber ? "code" : "phone")
      setMessage("")
    }
  }, [initialPhoneNumber, open])

  const handleSendCode = async () => {
    setMessage("")
    setIsSending(true)

    try {
      const result = await sendSMS_OTP(phoneNumber)
      if (!result.success || !result.phoneNumber) {
        setMessage(result.error ?? "Unable to send the code right now.")
        return
      }

      setPhoneNumber(result.phoneNumber)
      setStep("code")
      toast.success("Verification code sent on WhatsApp.")
    } catch {
      setMessage("Unable to send the code right now.")
    } finally {
      setIsSending(false)
    }
  }

  const handleVerifyCode = async () => {
    setMessage("")
    setIsVerifying(true)

    try {
      const result = await checkOTP(phoneNumber, code)
      if (!result.success || !result.phoneNumber) {
        setMessage(result.error ?? "Invalid verification code.")
        return
      }

      const saveResult = await linkVerifiedPhone(result.phoneNumber)
      if (!saveResult.success || !saveResult.phoneNumber) {
        setMessage(saveResult.error ?? "Unable to save verified phone number.")
        return
      }

      toast.success("Phone number linked successfully.")
      onVerified?.(saveResult.phoneNumber)
      onClose?.()
    } catch {
      setMessage("Unable to verify the code right now.")
    } finally {
      setIsVerifying(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {allowClose ? <button type="button" aria-label="Close phone verification modal" className="absolute inset-0 bg-[#0d1f17]/55" onClick={onClose} /> : <div className="absolute inset-0 bg-[#0d1f17]/55" />}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-[#c9d8d1] bg-white shadow-2xl">
        <div className="flex items-center justify-between bg-[#1f5a48] px-5 py-4 text-white">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="text-xs text-[#d7efe6]">{description}</p>
          </div>
          {allowClose ? (
            <button type="button" onClick={onClose} className="rounded-full p-1.5 text-[#e3f7ef] transition hover:bg-white/10">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-2xl border border-[#d3e5e0] bg-[#f4faf8] px-4 py-3 text-sm text-[#184f43]">
            <div className="flex items-center gap-2 font-semibold">
              <ShieldCheck className="h-4 w-4" />
              Secure SMS verification
            </div>
            <p className="mt-1 text-sm text-[#2b6353]">{phoneLabel}</p>
          </div>

          {step === "phone" ? (
            <div className="space-y-1">
              <label htmlFor="phoneNumber" className="text-sm font-semibold text-[#111827]">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="+2547XXXXXXXX"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                disabled={isSending || isVerifying}
                className="h-11 w-full rounded-2xl border border-[#d6d8de] bg-[#f7f8fa] px-3 text-sm text-[#111827] placeholder:text-[#7a8091] focus:border-[#2b6a56] focus:bg-white focus:outline-none disabled:opacity-70"
              />
              <p className="text-xs text-[#6b7280]">Use a number with country code. The code is sent by SMS.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <label htmlFor="otpCode" className="text-sm font-semibold text-[#111827]">
                Verification Code
              </label>
              <input
                id="otpCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="123456"
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\s/g, ""))}
                disabled={isSending || isVerifying}
                className="h-11 w-full rounded-2xl border border-[#d6d8de] bg-[#f7f8fa] px-3 text-sm text-[#111827] placeholder:text-[#7a8091] focus:border-[#2b6a56] focus:bg-white focus:outline-none disabled:opacity-70"
              />
              <p className="text-xs text-[#6b7280]">Enter the 6-digit code sent to {phoneNumber}.</p>
            </div>
          )}

          {message ? <p className="rounded-2xl border border-[#f3c7c7] bg-[#fff5f5] px-3 py-2 text-sm text-[#b42318]">{message}</p> : null}

          <div className="flex gap-3">
            {step === "code" ? (
              <button
                type="button"
                onClick={() => setStep("phone")}
                disabled={isSending || isVerifying}
                className="h-11 rounded-2xl border border-[#d6d8de] px-4 text-sm font-semibold text-[#184f43] transition hover:bg-[#f4faf8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                Change number
              </button>
            ) : null}

            <button
              type="button"
              onClick={step === "phone" ? handleSendCode : handleVerifyCode}
              disabled={(!phoneNumber.trim() && step === "phone") || (!code.trim() && step === "code") || isSending || isVerifying}
              className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1f5a48] px-4 text-sm font-semibold text-white transition hover:bg-[#184738] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending || isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
              {step === "phone" ? (isSending ? "Sending code..." : "Verify") : isVerifying ? "Checking code..." : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
