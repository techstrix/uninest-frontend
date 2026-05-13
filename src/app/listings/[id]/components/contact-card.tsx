"use client"

import { useState } from "react"
import { AlertTriangle, Mail, Phone, ShieldAlert, UserCircle2 } from "lucide-react"

type ContactCardProps = {
  listingId: string
  landlordName: string
  landlordPhoto: string | null
  phone: string | null
  email: string | null
}

export default function ContactCard({ listingId, landlordName, landlordPhoto, phone, email }: ContactCardProps) {
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [contact, setContact] = useState<{ phone: string | null; email: string | null } | null>(null)

  const continueReveal = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/contact-reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.error ?? "Failed to reveal contact")
        return
      }

      setContact(payload.contact)
      setRevealed(true)
      setOpen(false)
    } catch {
      setError("Failed to reveal contact")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Contact Landlord</h3>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-12 w-12 overflow-hidden rounded-full bg-[#184f43]">
          {landlordPhoto ? <img src={landlordPhoto} alt={landlordName} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-white"><UserCircle2 className="h-7 w-7" /></div>}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{landlordName}</p>
          <p className="text-xs text-gray-500">Verified landlord profile</p>
        </div>
      </div>

      {revealed ? (
        <div className="mt-4 space-y-3 text-sm">
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
            <a href={contact?.phone ? `tel:${contact.phone}` : "#"} className="mt-1 inline-flex items-center gap-2 text-[#184f43] font-semibold">
              <Phone className="h-4 w-4" />
              {contact?.phone ?? phone ?? "Not shared"}
            </a>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
            <p className="mt-1 inline-flex items-center gap-2 text-[#184f43] font-semibold">
              <Mail className="h-4 w-4" />
              {contact?.email ?? email ?? "Not shared"}
            </p>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-4 w-full rounded-lg bg-[#184f43] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#123f35]">
          Reveal contact
        </button>
      )}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/55" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-xl rounded-2xl border border-red-100 bg-white shadow-2xl">
            <div className="border-b border-red-100 px-6 py-5">
              <h2 className="text-xl font-bold text-red-700">Before you contact this landlord</h2>
              <p className="mt-1 text-sm text-gray-600">Please stay alert, verify details carefully, and only proceed if the listing and landlord seem legitimate.</p>
            </div>
            <div className="space-y-4 px-6 py-5 text-sm leading-7 text-gray-700">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-medium text-amber-900">UniNest recommends meeting in a safe public place, confirming the property exists, and being cautious with any requests for payment or personal information.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-start gap-2"><ShieldAlert className="mt-1 h-4 w-4 text-red-600" />Always verify the landlord identity and the property location.</div>
                <div className="flex items-start gap-2"><AlertTriangle className="mt-1 h-4 w-4 text-amber-600" />Do not send money or share sensitive information before confirming the listing.</div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
              <button onClick={() => setOpen(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
              <button onClick={continueReveal} disabled={loading} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Revealing..." : "Continue"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
