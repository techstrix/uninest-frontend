"use client"

import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Loader2, MessageSquare, Star, UserCircle2 } from "lucide-react"

type ReviewItem = {
  id: string
  rating: number
  comment: string | null
  createdAt: string
  student: {
    firstName: string | null
    lastName: string | null
    profilePhoto: string | null
  }
}

type ReviewsSectionProps = {
  listingId: string
  reviews: ReviewItem[]
  averageRating: number | null
  ratingCount: number
}

export default function ReviewsSection({ listingId, reviews, averageRating, ratingCount }: ReviewsSectionProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const role = user?.publicMetadata?.role
  const canReview = isLoaded && role === "student"

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    startTransition(async () => {
      try {
        const response = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, rating, comment }),
        })

        const payload = await response.json()
        if (!response.ok) {
          setError(payload.error ?? "Failed to save review.")
          return
        }

        setComment("")
        setRating(5)
        router.refresh()
      } catch {
        setError("Failed to save review.")
      }
    })
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Reviews</h2>
          <p className="text-sm text-slate-500">Student feedback for this listing</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
          {averageRating ? averageRating.toFixed(1) : "-"} · {ratingCount} reviews
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-2xl border border-gray-100 bg-[#f8faf8] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <MessageSquare className="h-4 w-4 text-[#1f5a48]" />
            Leave a review
          </div>

          {canReview ? (
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Rating</label>
                <div className="flex flex-wrap gap-2">
                  {[5, 4, 3, 2, 1].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${rating === value ? "border-[#1f5a48] bg-[#1f5a48] text-white" : "border-gray-200 bg-white text-slate-700"}`}
                    >
                      <Star className={`h-4 w-4 ${rating === value ? "fill-white text-white" : "fill-amber-400 text-amber-400"}`} />
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <label className="block space-y-2 text-sm">
                <span className="font-medium text-slate-700">Comment</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={4}
                  placeholder="Tell other students what stood out about the place."
                  className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1f5a48]"
                />
              </label>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}

              <button
                type="submit"
                disabled={isPending}
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#1f5a48] px-4 text-sm font-semibold text-white transition hover:bg-[#184738] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isPending ? "Saving..." : "Post review"}
              </button>
            </form>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-300 bg-white p-4 text-sm text-slate-600">
              Sign in as a student to leave a review.
            </div>
          )}
        </div>

        <div className="space-y-3">
          {reviews.length > 0 ? (
            reviews.map((review) => (
              <div key={review.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#184f43] text-white">
                    {review.student.profilePhoto ? (
                      <img src={review.student.profilePhoto} alt="Reviewer" className="h-full w-full object-cover" />
                    ) : (
                      <UserCircle2 className="h-6 w-6" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-semibold text-slate-900">
                        {`${review.student.firstName ?? ""} ${review.student.lastName ?? ""}`.trim() || "Student"}
                      </p>
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star key={index} className={`h-3.5 w-3.5 ${index < review.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{new Date(review.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment ?? "No comment left."}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-slate-500">
              No reviews yet. Be the first student to share feedback.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
