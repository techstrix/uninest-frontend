"use client"

import { useState } from "react"
import { Star, X, AlertTriangle, Shield } from "lucide-react"

type PayDepositCardProps = {
  landlordName: string
  initials: string
  avgRating: number | null
  ratingCount: number
  phone: string | null
}

export default function PayDepositCard({ landlordName, initials, avgRating, ratingCount, phone }: PayDepositCardProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h3 className="text-lg font-bold text-gray-900">Pay Deposit</h3>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#184f43] text-sm font-bold text-white">
            {initials || "LD"}
          </div>
          <div>
            <p className="font-semibold text-gray-900">{landlordName}</p>
            <p className="text-xs text-gray-500">
              {avgRating ? (
                <span className="inline-flex items-center gap-1">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {avgRating.toFixed(1)} · {ratingCount} reviews
                </span>
              ) : (
                "No reviews yet"
              )}
            </p>
          </div>
        </div>

        <button
          className="mt-4 w-full rounded-lg bg-[#184f43] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123f35]"
          onClick={() => setIsOpen(true)}
        >
          Pay Deposit
        </button>

        {phone ? <p className="mt-3 text-xs text-gray-500">Phone: {phone}</p> : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsOpen(false)} />

          <div className="relative z-10 w-full max-w-3xl rounded-2xl border border-emerald-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-emerald-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#184f43]">Before You Proceed - Important Notice</h2>
                <p className="mt-1 text-sm text-gray-600">Please read this carefully before making payment.</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close notice"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5 text-sm leading-7 text-gray-700">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">
                  We strongly advise you to physically visit and verify this property before making any payment.
                  UniNest cannot guarantee the accuracy of listing details, and it is your responsibility to confirm
                  that the property exists and matches its description.
                </p>
              </div>

              <div>
                <p className="mb-2 font-semibold text-gray-900">By proceeding, you acknowledge the following:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 shrink-0 text-[#184f43]" />
                    <span>
                      Your payment will be held securely in escrow for 48 hours from your confirmed move-in date,
                      giving you time to raise any concerns before funds are released to the landlord.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 shrink-0 text-[#184f43]" />
                    <span>
                      If the property does not match the listing or the landlord is unresponsive, you may raise a
                      dispute within this window and your payment will be reviewed by our team.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 shrink-0 text-[#184f43]" />
                    <span>
                      After 48 hours with no dispute raised, your payment will be automatically released to the
                      landlord.
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="mt-1 h-4 w-4 shrink-0 text-[#184f43]" />
                    <span>
                      UniNest is a platform that facilitates connections between students and landlords. We are not a
                      party to your rental agreement and do not guarantee tenancy outcomes beyond the escrow window.
                    </span>
                  </li>
                </ul>
              </div>

              <div>
                <p className="mb-2 font-semibold text-gray-900">We strongly recommend:</p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Visiting the property in person before paying</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                    <span>Confirming the landlord&apos;s identity matches their verified profile</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-600" />
                    <span>
                      Never paying outside the UniNest platform - payments made directly to a landlord are not
                      protected
                    </span>
                  </li>
                </ul>
              </div>

              <p className="rounded-lg border border-[#d3e5e0] bg-[#f4faf8] p-4 font-medium text-[#184f43]">
                By clicking Confirm and Pay, you confirm that you have read and understood this notice and agree to
                proceed at your own informed discretion.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-[#184f43] px-4 py-2 text-sm font-semibold text-white hover:bg-[#123f35]"
              >
                Confirm and Pay
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
