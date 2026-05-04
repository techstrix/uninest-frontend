"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { deleteListing, suspendListing } from "@/app/actions/manage-listings"

type LandlordSearchData = {
  id: string
  userId: string
  name: string
  username: string | null
  email: string
  phone: string | null
  verified: boolean
  trustScore: number
  listings: Array<{
    id: string
    title: string
    address: string
    price: number
    status: string
  }>
}

export default function LandlordListingsManager({ landlords }: { landlords: LandlordSearchData[] }) {
  const [query, setQuery] = useState("")
  const [pendingId, setPendingId] = useState<string | null>(null)
  const router = useRouter()
  const normalizedQuery = query.trim().toLowerCase()

  const filtered = landlords.filter((landlord) => {
    if (!normalizedQuery) return true
    return [landlord.name, landlord.username ?? "", landlord.email, landlord.phone ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  })

  const handleSuspend = async (listingId: string) => {
    setPendingId(listingId)
    try {
      await suspendListing(listingId)
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  const handleDelete = async (listingId: string) => {
    setPendingId(listingId)
    try {
      await deleteListing(listingId)
      router.refresh()
    } finally {
      setPendingId(null)
    }
  }

  return (
    <div className="p-4">
      <div className="max-w-xl">
        <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Search landlords</label>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, username, or phone"
          className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-slate-400"
        />
      </div>

      <div className="mt-4 space-y-3">
        {filtered.map((landlord) => (
          <div key={landlord.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-slate-900">{landlord.name}</p>
                <p className="text-sm text-slate-500">
                  {landlord.email}
                  {landlord.phone ? ` · ${landlord.phone}` : ""}
                </p>
                <p className="text-xs text-slate-400">Trust score {landlord.trustScore} · {landlord.verified ? "Verified" : "Pending"}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{landlord.listings.length} properties</p>
                <p className="mt-1 text-xs text-slate-400">Landlord ID: {landlord.userId}</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {landlord.listings.length === 0 ? (
                <p className="text-sm text-slate-500">No listings found for this landlord.</p>
              ) : (
                landlord.listings.map((listing) => (
                  <div key={listing.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{listing.title}</p>
                      <p className="text-sm text-slate-500">{listing.address}</p>
                      <p className="text-xs text-slate-400">KES {listing.price.toLocaleString()} · {listing.status}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSuspend(listing.id)}
                        disabled={pendingId === listing.id}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Suspend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(listing.id)}
                        disabled={pendingId === listing.id}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Delete property
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
            No landlords match your search.
          </div>
        ) : null}
      </div>
    </div>
  )
}
