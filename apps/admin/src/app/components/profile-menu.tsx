"use client"

import { useMemo, useState, useTransition } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { logout } from "@/app/actions/logout"
import { moderateFraudReport } from "@/app/actions/moderate-fraud-report"

type ProfileMenuProps = {
  fullName: string
  email: string
  initials: string
}

export default function ProfileMenu({ fullName, email, initials }: ProfileMenuProps) {
  const [open, setOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    setIsLoggingOut(true)
    await logout()
    router.replace("/sign-in")
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left transition hover:bg-white/15"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25395f] text-sm font-bold text-white">{initials}</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{fullName}</p>
          <p className="truncate text-xs text-white/65">Super Administrator</p>
        </div>
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-semibold text-slate-900">{fullName}</p>
              <p className="truncate text-xs text-slate-500">{email}</p>
            </div>
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="text-sm text-slate-500">↪</span>
              {isLoggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </>
      ) : null}
    </div>
  )
}

export type AdminFraudReport = {
  id: string
  category: string
  reason: string
  status: string
  visitedProperty: boolean
  acknowledged: boolean
  createdAt: string
  evidenceUrls: string[]
  listing: {
    id: string
    title: string
    address: string
    price: number
    status: string
    photoUrl: string | null
  }
  reporter: {
    id: string
    name: string
    username: string
    email: string
    phone: string | null
  }
}

export function FraudReportsPanel({ reports }: { reports: AdminFraudReport[] }) {
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)

  const selectedReport = useMemo(() => reports.find((item) => item.id === selectedReportId) ?? null, [reports, selectedReportId])

  if (reports.length === 0) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-sm font-semibold text-slate-700">No fraud reports submitted yet</p>
        <p className="mt-1 text-xs text-slate-500">New reports will appear here automatically.</p>
      </div>
    )
  }

  return (
    <>
      <div className="divide-y divide-slate-100">
        {reports.map((report) => (
          <div key={report.id} className="flex items-start gap-3 px-4 py-3">
            <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">!</div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900">{report.listing.title}</p>
              <p className="text-sm font-bold text-slate-700">KES {report.listing.price.toLocaleString()}</p>
              <p className="text-xs text-slate-500">Reason: {report.category}</p>
              <p className="line-clamp-1 text-xs text-slate-400">{report.reason}</p>
              <p className="mt-0.5 text-xs text-slate-400">Reported {formatRelativeDate(report.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedReportId(report.id)}
                className="rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
              >
                Review
              </button>
            </div>
          </div>
        ))}
      </div>

      {selectedReport ? <FraudReportReviewModal report={selectedReport} onClose={() => setSelectedReportId(null)} /> : null}
    </>
  )
}

function FraudReportReviewModal({ report, onClose }: { report: AdminFraudReport; onClose: () => void }) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [pendingAction, setPendingAction] = useState<"suspend-listing" | "reject-report" | null>(null)
  const [isPending, startTransition] = useTransition()

  const actionLabel = pendingAction === "suspend-listing" ? "suspend listing" : pendingAction === "reject-report" ? "reject report" : ""

  const confirmAction = () => {
    if (!pendingAction) return

    startTransition(async () => {
      await moderateFraudReport({
        reportId: report.id,
        action: pendingAction,
        reason,
      })
      router.refresh()
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close review modal" onClick={onClose} className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />

      <div className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Fraud Report Review</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{report.listing.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Close
          </button>
        </div>

        <div className="grid max-h-[calc(92vh-76px)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[1.15fr_1fr]">
          <section className="space-y-4 border-b border-slate-200 p-5 lg:border-b-0 lg:border-r">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {report.listing.photoUrl ? (
                <div className="relative h-52 w-full">
                  <Image src={`http://localhost:3000/${report.listing.photoUrl}`} alt={report.listing.title} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="flex h-52 items-center justify-center bg-slate-200 text-sm font-semibold text-slate-500">No listing image</div>
              )}
              <div className="space-y-1 px-4 py-3">
                <p className="font-semibold text-slate-900">{report.listing.title}</p>
                <p className="text-xs text-slate-500">{report.listing.address}</p>
                <p className="text-sm font-bold text-slate-800">KES {report.listing.price.toLocaleString()}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Report Details</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <DetailItem label="Category" value={report.category} />
                <DetailItem label="Status" value={report.status} />
                <DetailItem label="Visited Property" value={report.visitedProperty ? "Yes" : "No"} />
                <DetailItem label="Acknowledged" value={report.acknowledged ? "Yes" : "No"} />
              </div>
              <div className="mt-3 rounded-lg bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">Reason</p>
                <p className="mt-1 text-sm text-slate-700">{report.reason}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Reporter</p>
              <div className="mt-3 space-y-2 text-sm">
                <DetailRow label="Name" value={report.reporter.name} />
                <DetailRow label="Email" value={report.reporter.email} />
                <DetailRow label="Username" value={report.reporter.username} />
                <DetailRow label="Phone" value={report.reporter.phone || "Not provided"} />
                <DetailRow label="Submitted" value={new Date(report.createdAt).toLocaleString()} />
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-4 p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Evidence ({report.evidenceUrls.length})</p>
            </div>

            {report.evidenceUrls.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">No evidence files attached.</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {report.evidenceUrls.map((url, index) => {
                  const looksLikeImage = /\.(png|jpe?g|webp|gif)$/i.test(url)
                  const looksLikePdf = /\.pdf$/i.test(url)

                  return (
                    <article key={`${report.id}-${index}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="relative h-32 w-full bg-slate-100">
                        {looksLikeImage ? (
                          <Image src={`http://localhost:3000/${url}`} alt={`Evidence ${index + 1}`} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-500">{looksLikePdf ? "PDF Evidence" : "File Evidence"}</div>
                        )}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2">
                        <p className="truncate text-xs text-slate-600">Evidence {index + 1}</p>
                        <a
                          href={`http://localhost:3000/${url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Open
                        </a>
                      </div>
                    </article>
                    )
                })}
              </div>
            )}

            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Admin Reason</p>
              <p className="mt-1 text-sm text-slate-600">This reason will be included in the email sent after confirmation.</p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={5}
                className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-400"
                placeholder="Explain why you are suspending the listing or rejecting the report..."
              />
            </div>

            {pendingAction ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Confirm to {actionLabel}</p>
                <p className="mt-1 text-sm text-amber-800">
                  This will send the email, include your reason, and complete the moderation action.
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingAction(null)}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmAction}
                    disabled={isPending || reason.trim().length < 10}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPending ? "Sending..." : "Confirm and send"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setPendingAction("suspend-listing")}
                disabled={reason.trim().length < 10 || isPending}
                className="rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Suspend listing
              </button>
              <button
                type="button"
                onClick={() => setPendingAction("reject-report")}
                disabled={reason.trim().length < 10 || isPending}
                className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reject report
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
      <p className="text-slate-500">{label}</p>
      <p className="text-right font-medium text-slate-800">{value}</p>
    </div>
  )
}

function formatRelativeDate(isoDate: string) {
  const createdAt = new Date(isoDate).getTime()
  const now = Date.now()
  const diffMs = Math.max(now - createdAt, 0)
  const hour = 60 * 60 * 1000
  const day = 24 * hour

  if (diffMs < hour) {
    const minutes = Math.max(Math.floor(diffMs / (60 * 1000)), 1)
    return `${minutes} min ago`
  }

  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour)
    return `${hours} hr ago`
  }

  const days = Math.floor(diffMs / day)
  return `${days} day${days > 1 ? "s" : ""} ago`
}
