"use client"

import { useEffect } from "react"

export default function ViewTracker({ listingId }: { listingId: string }) {
  useEffect(() => {
    fetch("/api/listing-view", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ listingId }),
    })
  }, [listingId])

  return null
}