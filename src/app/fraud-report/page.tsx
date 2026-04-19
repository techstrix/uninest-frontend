"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { AlertTriangle, Check, Loader2, Upload, X } from "lucide-react"

const categories = [
  "Property does not exist",
  "Photos are fake or stolen",
  "Price changed after contact",
  "Property already occupied / not available",
  "Landlord identity does not match profile",
  "Other",
]

type PreviewItem = {
  id: string
  name: string
  url: string
  type: string
}

export default function FraudReportPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const listingId = useMemo(() => searchParams.get("listingId")?.trim() ?? "", [searchParams])
  const [category, setCategory] = useState("")
  const [reason, setReason] = useState("")
  const [visitedProperty, setVisitedProperty] = useState<"yes" | "no">("no")
  const [acknowledged, setAcknowledged] = useState(false)
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<PreviewItem[]>([])
  const [listingPreview, setListingPreview] = useState<{ title: string; address: string; price: string; photoUrl: string | null } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    if (!listingId) {
      setError("Missing listing id.")
      return
    }

    setError("")
  }, [listingId])

  useEffect(() => {
    let active = true

    const loadListing = async () => {
      if (!listingId) return

      try {
        const response = await fetch(`/api/listings?listingId=${encodeURIComponent(listingId)}`)
        if (!response.ok) return

        const data = await response.json()
        const found = data?.listing

        if (active && found) {
          setListingPreview({
            title: found.title,
            address: found.address,
            price: Number(found.price).toLocaleString(),
            photoUrl: found.photoUrl ?? null,
          })
        }
      } catch {
        // ignore preview failures
      }
    }

    loadListing()

    return () => {
      active = false
    }
  }, [listingId])

  useEffect(() => {
    if (!showSuccessModal) return

    const timeout = setTimeout(() => {
      router.push("/home")
    }, 1400)

    return () => clearTimeout(timeout)
  }, [router, showSuccessModal])

  const handleEvidenceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? [])
    setEvidenceFiles(nextFiles)

    const nextPreviews = nextFiles.slice(0, 5).map((file) => ({
      id: `${file.name}-${file.size}-${file.lastModified}`,
      name: file.name,
      url: URL.createObjectURL(file),
      type: file.type,
    }))

    setPreviews(nextPreviews)
  }

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!listingId) {
      setError("Missing listing id.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.append("listingId", listingId)
      formData.append("category", category)
      formData.append("reason", reason)
      formData.append("visitedProperty", visitedProperty)
      formData.append("acknowledged", String(acknowledged))

      evidenceFiles.forEach((file) => formData.append("evidenceFiles", file))

      const response = await fetch("/api/fraud-report", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data?.error || "Failed to submit report.")
        return
      }

      setShowSuccessModal(true)
    } catch {
      setError("Failed to submit report.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const closeSuccessModal = () => {
    setShowSuccessModal(false)
    router.push("/home")
  }

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-10 sm:px-6 lg:px-8">
      <section className="mx-auto w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="bg-[#184f43] px-6 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-200">Fraud Report</p>
          <h1 className="mt-2 text-3xl font-bold">Report this listing</h1>
          <p className="mt-2 text-sm text-emerald-100">Help keep UniNest safe by reporting suspicious or misleading listings.</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-6">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Your report will be reviewed. Submit only if you believe this listing is fraudulent, misleading, or unsafe.</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#111827]">Listing ID</label>
                <input
                  value={listingId}
                  readOnly
                  className="h-11 w-full rounded-lg border border-transparent bg-[#f1f2f5] px-3 text-sm text-[#111827]"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="category" className="text-sm font-semibold text-[#111827]">Report Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="h-11 w-full rounded-lg border border-transparent bg-[#f1f2f5] px-3 text-sm text-[#111827] focus:border-[#184f43] focus:bg-white focus:outline-none"
                >
                  <option value="">Select a category</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#111827]">Property Preview</label>
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-[#f7f7f9]">
                  {listingPreview?.photoUrl ? (
                    <div className="relative h-52 w-full">
                      <Image src={listingPreview.photoUrl} alt={listingPreview.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-52 items-center justify-center bg-[#184f43] text-emerald-100">
                      No listing photo available
                    </div>
                  )}
                  <div className="space-y-1 px-4 py-4">
                    <p className="text-sm font-semibold text-[#111827]">{listingPreview?.title ?? "Loading listing..."}</p>
                    <p className="text-xs text-gray-500">{listingPreview?.address ?? ""}</p>
                    <p className="text-sm font-bold text-[#184f43]">{listingPreview ? `KES ${listingPreview.price}` : ""}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#111827]">Did you visit the property?</p>
                    <p className="text-xs text-gray-500">Reports from people who visited carry more weight.</p>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVisitedProperty("yes")}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${visitedProperty === "yes" ? "border-[#184f43] bg-emerald-50 text-[#184f43]" : "border-gray-200 bg-white text-gray-700"}`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisitedProperty("no")}
                    className={`rounded-lg border px-4 py-3 text-sm font-semibold transition ${visitedProperty === "no" ? "border-[#184f43] bg-emerald-50 text-[#184f43]" : "border-gray-200 bg-white text-gray-700"}`}
                  >
                    No
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="text-sm font-semibold text-[#111827]">Report Details</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={6}
                  placeholder="Explain what happened and include any relevant details..."
                  className="w-full rounded-lg border border-transparent bg-[#f1f2f5] px-3 py-3 text-sm text-[#111827] placeholder:text-[#7a8091] focus:border-[#184f43] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-[#111827]">Supporting Evidence Upload</label>
                <div className="rounded-xl border border-dashed border-[#cfd2d8] bg-[#f7f7f9] p-4">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-[#184f43] hover:bg-gray-50">
                    <Upload className="h-4 w-4" />
                    Upload evidence files
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                      multiple
                      className="sr-only"
                      onChange={handleEvidenceChange}
                    />
                  </label>
                  <p className="mt-2 text-xs text-gray-500">JPG, PNG, PDF. Max 5 files, 10MB each.</p>
                  {evidenceFiles.length > 0 ? (
                    <p className="mt-2 text-xs font-medium text-[#184f43]">{evidenceFiles.length} file(s) selected</p>
                  ) : null}

                  {previews.length > 0 ? (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {previews.map((file) => (
                        <div key={file.id} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                          <div className="relative aspect-square bg-[#e9ecef]">
                            {file.type.startsWith("image/") ? (
                              <Image src={file.url} alt={file.name} fill className="object-cover" unoptimized />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs font-semibold text-gray-500">PDF</div>
                            )}
                          </div>
                          <div className="px-2 py-2 text-xs text-gray-600">{file.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(event) => setAcknowledged(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <span>
                  I confirm this report is genuine and I understand that false reports may result in my account being reviewed.
                </span>
              </label>
            </div>
          </div>

          {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}

          <button
            type="submit"
            disabled={isSubmitting || !listingId || !category || !acknowledged}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#fb8a3c] text-sm font-semibold text-white transition hover:bg-[#f07a2f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Submitting..." : "Submit Report"}
          </button>

          <div className="text-center">
            <Link href="/home" className="text-sm font-semibold text-[#184f43] hover:underline">
              Cancel and return home
            </Link>
          </div>
        </form>
      </section>

      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/50" onClick={closeSuccessModal} aria-label="Close success modal" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[#d3e5e0] bg-white p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeSuccessModal}
              className="absolute right-3 top-3 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-[#184f43]">
                <Check className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold text-[#111827]">Report submitted</h2>
              <p className="mt-2 text-sm text-gray-600">Your report was successfully submitted.</p>
              <button
                type="button"
                onClick={closeSuccessModal}
                className="mt-5 h-11 w-full rounded-lg bg-[#184f43] text-sm font-semibold text-white hover:bg-[#123f35]"
              >
                Return home
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
