"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteListingAction, updateListingAction } from "./actions"

export type DashboardListing = {
  id: string
  title: string
  description: string | null
  address: string
  price: number
  deposit: number | null
  bedroomType: string | null
  status: string
  mainWalkingMinutes: number | null
  chiromoWalkingMinutes: number | null
  parklandsWalkingMinutes: number | null
  campusMinutes: number | null
  campusLabel: string
  views: number
  expiresAt: string | null
  photoUrl: string | null
  photos: {
    id: string
    photoUrl: string
    displayOrder: number
  }[]
}

type EditFormState = {
  id: string
  title: string
  description: string
  address: string
  price: string
  deposit: string
  bedroomType: string
  status: string
  mainWalkingMinutes: string
  chiromoWalkingMinutes: string
  parklandsWalkingMinutes: string
  photos: {
    id: string
    photoUrl: string
    displayOrder: number
  }[]
}

type ListingsManagerProps = {
  listings: DashboardListing[]
}

const BEDROOM_TYPE_OPTIONS = ["Bedsitter", "Studio", "Single Room", "One Bedroom", "Two Bedroom", "Shared Room"]

function normalizeBedroomType(value: string | null | undefined): string {
  if (!value) return ""
  const trimmed = value.trim()
  if (!trimmed) return ""

  const matched = BEDROOM_TYPE_OPTIONS.find((option) => option.toLowerCase() === trimmed.toLowerCase())
  return matched ?? trimmed
}

function formatMinutes(minutes: number | null) {
  if (minutes === null || Number.isNaN(minutes)) return "-"
  return `${minutes} min`
}

function toEditFormState(listing: DashboardListing): EditFormState {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description ?? "",
    address: listing.address,
    price: String(listing.price),
    deposit: listing.deposit === null ? "" : String(listing.deposit),
    bedroomType: normalizeBedroomType(listing.bedroomType),
    status: listing.status,
    mainWalkingMinutes: listing.mainWalkingMinutes === null ? "" : String(listing.mainWalkingMinutes),
    chiromoWalkingMinutes: listing.chiromoWalkingMinutes === null ? "" : String(listing.chiromoWalkingMinutes),
    parklandsWalkingMinutes: listing.parklandsWalkingMinutes === null ? "" : String(listing.parklandsWalkingMinutes),
    photos: [...listing.photos].sort((a, b) => a.displayOrder - b.displayOrder),
  }
}

export default function ListingsManager({ listings }: ListingsManagerProps) {
  const [editingListing, setEditingListing] = useState<EditFormState | null>(null)
  const [deletingListing, setDeletingListing] = useState<DashboardListing | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [newPhotos, setNewPhotos] = useState<File[]>([])
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const slotsUsedText = useMemo(() => `${listings.length} of 3 slots used`, [listings.length])

  const onSubmitEdit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!editingListing) return

    setErrorMessage(null)

    const formData = new FormData()
    formData.set("id", editingListing.id)
    formData.set("title", editingListing.title)
    formData.set("description", editingListing.description)
    formData.set("address", editingListing.address)
    formData.set("price", editingListing.price)
    formData.set("deposit", editingListing.deposit)
    formData.set("bedroomType", editingListing.bedroomType)
    formData.set("status", editingListing.status)
    formData.set("mainWalkingMinutes", editingListing.mainWalkingMinutes)
    formData.set("chiromoWalkingMinutes", editingListing.chiromoWalkingMinutes)
    formData.set("parklandsWalkingMinutes", editingListing.parklandsWalkingMinutes)
    editingListing.photos.forEach((photo) => {
      formData.append("keepPhotoIds", photo.id)
    })
    newPhotos.forEach((photo) => {
      formData.append("newPhotos", photo)
    })

    startTransition(async () => {
      const result = await updateListingAction(formData)
      if (!result.ok) {
        setErrorMessage(result.error ?? "Failed to update listing.")
        return
      }

      setEditingListing(null)
      setNewPhotos([])
      router.refresh()
    })
  }

  const onConfirmDelete = () => {
    if (!deletingListing) return

    setErrorMessage(null)

    const formData = new FormData()
    formData.set("id", deletingListing.id)

    startTransition(async () => {
      const result = await deleteListingAction(formData)
      if (!result.ok) {
        setErrorMessage(result.error ?? "Failed to delete listing.")
        return
      }

      setDeletingListing(null)
      router.refresh()
    })
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-900">Active Listings</h2>
        <p className="text-sm text-slate-500">{slotsUsedText}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="grid grid-cols-[2.5fr_1fr_0.8fr_1fr_1fr] gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 text-xs font-bold uppercase tracking-wide text-slate-500">
          <div>Property</div>
          <div>Status</div>
          <div>Views</div>
          <div>Expires</div>
          <div>Actions</div>
        </div>

        <div className="divide-y divide-gray-100">
          {listings.map((listing) => (
            <div key={listing.id} className="grid grid-cols-1 gap-4 px-6 py-4 md:grid-cols-[2.5fr_1fr_0.8fr_1fr_1fr] md:items-center">
              <div className="flex items-center gap-4">
                <div className="hidden h-14 w-14 overflow-hidden rounded-xl bg-[#184f43] md:block">
                  {listing.photoUrl ? <img src={listing.photoUrl} alt={listing.title} className="h-full w-full object-cover" /> : null}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{listing.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    KES {listing.price.toLocaleString()} / mo · {formatMinutes(listing.campusMinutes)} · {listing.campusLabel}
                  </p>
                  <p className="text-xs text-slate-400">{listing.address}</p>
                </div>
              </div>

              <div>
                <span
                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                    listing.status.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {listing.status === "expiring soon" ? "Expiring soon" : listing.status}
                </span>
              </div>

              <div className="text-sm text-slate-700">{listing.views} views</div>

              <div className="text-sm text-slate-700">{listing.expiresAt}</div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingListing(toEditFormState(listing))
                    setNewPhotos([])
                    setErrorMessage(null)
                  }}
                  className="rounded-md bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setDeletingListing(listing)}
                  className="rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {listings.length === 0 && <div className="px-6 py-10 text-center text-sm text-slate-500">No listings yet. Create your first property to get started.</div>}
        </div>
      </div>

      {editingListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Edit Listing</h3>
                <p className="text-sm text-slate-500">Update the listing details and save your changes.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingListing(null)
                  setErrorMessage(null)
                }}
                className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={onSubmitEdit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Title</span>
                  <input
                    value={editingListing.title}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, title: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <select
                    value={editingListing.status}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, status: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    {["active", "draft", "expiring soon", "inactive"].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Address</span>
                <input
                  value={editingListing.address}
                  onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, address: event.target.value } : prev))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Price (KES)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingListing.price}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, price: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                    required
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Deposit (KES)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editingListing.deposit}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, deposit: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Bedroom Type</span>
                  <select
                    value={editingListing.bedroomType}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, bedroomType: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  >
                    <option value="">Select bedroom type</option>
                    {BEDROOM_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                    {editingListing.bedroomType && !BEDROOM_TYPE_OPTIONS.some((option) => option.toLowerCase() === editingListing.bedroomType.toLowerCase()) ? (
                      <option value={editingListing.bedroomType}>{editingListing.bedroomType}</option>
                    ) : null}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Main (mins)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingListing.mainWalkingMinutes}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, mainWalkingMinutes: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Chiromo (mins)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingListing.chiromoWalkingMinutes}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, chiromoWalkingMinutes: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>

                <label className="space-y-1 text-sm">
                  <span className="font-medium text-slate-700">Parklands (mins)</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editingListing.parklandsWalkingMinutes}
                    onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, parklandsWalkingMinutes: event.target.value } : prev))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2"
                  />
                </label>
              </div>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-slate-700">Description</span>
                <textarea
                  rows={4}
                  value={editingListing.description}
                  onChange={(event) => setEditingListing((prev) => (prev ? { ...prev, description: event.target.value } : prev))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </label>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Photos</p>
                <p className="text-xs text-slate-500">Remove photos with X, then upload better replacements. Max 5 photos total.</p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {editingListing.photos.map((photo) => (
                    <div key={photo.id} className="relative overflow-hidden rounded-lg border border-gray-200">
                      <img src={photo.photoUrl} alt="Listing" className="h-24 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setEditingListing((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  photos: prev.photos.filter((item) => item.id !== photo.id),
                                }
                              : prev,
                          )
                        }
                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs font-semibold text-white"
                        aria-label="Remove photo"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? [])
                    setNewPhotos(files)
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />

                {newPhotos.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-slate-600">
                    <p className="mb-2 font-medium text-slate-700">New photos selected:</p>
                    <ul className="space-y-1">
                      {newPhotos.map((photo, index) => (
                        <li key={`${photo.name}-${index}`} className="flex items-center justify-between gap-3">
                          <span className="truncate">{photo.name}</span>
                          <button
                            type="button"
                            onClick={() => setNewPhotos((prev) => prev.filter((_, i) => i !== index))}
                            className="rounded border border-gray-300 px-2 py-0.5 text-[11px] font-medium"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>

              {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingListing(null)
                    setNewPhotos([])
                    setErrorMessage(null)
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-[#1f5a48] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isPending ? "Saving..." : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {deletingListing ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">Delete Listing</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will permanently delete <span className="font-semibold">{deletingListing.title}</span> and all related records.
            </p>

            {errorMessage ? <p className="mt-3 text-sm text-red-600">{errorMessage}</p> : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeletingListing(null)
                  setErrorMessage(null)
                }}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={onConfirmDelete}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
