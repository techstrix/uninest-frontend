"use client"

import { useState } from "react"
import { useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { LogOut, Trash2 } from "lucide-react"
import { toast } from "sonner"

type ProfileMenuProps = {
  fullName: string
  initials: string
  email: string
}

export default function ProfileMenu({ fullName, initials, email }: ProfileMenuProps) {
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const { signOut } = useClerk()
  const router = useRouter()

  const handleLogout = async () => {
    await signOut()
    router.push("/sign-in")
  }

  const handleConfirmDelete = async () => {
    if (confirmDelete) return

    try {
      setConfirmDelete(true)
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        toast.error("Failed to delete account. Please try again.")
        return
      }

      setShowDeleteConfirm(false)
      toast.success("Account deleted successfully.")
      router.push("/sign-up")
    } catch (error) {
      console.error("Failed to delete account", error)
      toast.error("Failed to delete account. Please try again.")
    } finally {
      setConfirmDelete(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowProfileMenu((previous) => !previous)}
        className="flex w-full items-center gap-3 rounded-xl bg-white/10 px-3 py-3 text-left"
      >
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#245f4d] text-sm font-bold text-white">
          {initials || "PK"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{fullName}</p>
          <p className="text-xs text-emerald-100/75">Landlord · Verified ✓</p>
        </div>
      </button>

      {showProfileMenu ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{fullName}</p>
              <p className="truncate text-xs text-gray-500">{email}</p>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 text-gray-400" />
              Log out
            </button>

            <div className="mt-1 border-t border-gray-100 pt-1">
              <button
                onClick={() => {
                  setShowDeleteConfirm(true)
                  setShowProfileMenu(false)
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Account
              </button>
            </div>
          </div>
        </>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteConfirm(false)} />
          <div className="relative mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>

              <h3 className="mb-2 text-lg font-semibold text-gray-900">Delete Account?</h3>

              <p className="mb-6 text-sm text-gray-500">
                Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={confirmDelete}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
                >
                  {confirmDelete ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}