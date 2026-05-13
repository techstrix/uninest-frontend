"use client"

import { useRouter } from "next/navigation"
import type { FormEvent } from "react"
import { useState, useTransition } from "react"
import { Camera } from "lucide-react"
import { updateProfilePhotoAction } from "../actions"

export default function PhotoUploadClient({ initialName }: { initialName: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    if (!file) {
      setError("Please choose a profile photo.")
      return
    }

    const formData = new FormData()
    formData.set("photo", file)

    startTransition(async () => {
      const result = await updateProfilePhotoAction(formData)
      if (!result.ok) {
        setError(result.error ?? "Failed to upload profile photo.")
        return
      }

      router.push("/landlord-dashboard")
      router.refresh()
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-slate-900">{initialName}</p>
        <p className="text-sm text-slate-500">This photo will show on your listing page.</p>
      </div>

      <label className="block space-y-2 text-sm font-medium text-slate-700">
        <span>Profile photo</span>
        <input type="file" accept="image/*" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="w-full rounded-xl border border-gray-300 px-3 py-2" />
      </label>

      {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <button type="submit" disabled={isPending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#dc2626] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
        <Camera className="h-4 w-4" />
        {isPending ? "Uploading..." : "Continue"}
      </button>
    </form>
  )
}
