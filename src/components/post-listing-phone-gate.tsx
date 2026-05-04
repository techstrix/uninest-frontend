"use client"

import { useRouter } from "next/navigation"
import PhoneVerificationModal from "./phone-verification-modal"

type PostListingPhoneGateProps = {
  phoneNumber?: string | null
}

export default function PostListingPhoneGate({ phoneNumber }: PostListingPhoneGateProps) {
  const router = useRouter()

  return (
    <PhoneVerificationModal
      open
      allowClose={false}
      title="Verify your phone first"
      description="Phone verification is required before you can post a listing."
      phoneLabel="Enter your phone number to receive an SMS code."
      initialPhoneNumber={phoneNumber}
      onVerified={() => router.refresh()}
    />
  )
}
