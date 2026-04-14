"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import { X, ChevronLeft, ChevronRight, Grid } from "lucide-react"

type Photo = {
  id: string
  photoUrl: string
  displayOrder: number
}

type PhotoModalProps = {
  photos: Photo[]
  isOpen: boolean
  onClose: () => void
  initialIndex?: number
}

export default function PhotoModal({ photos, isOpen, onClose, initialIndex = 0 }: PhotoModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  useEffect(() => {
    if (isOpen) {
      const boundedIndex = Math.min(Math.max(initialIndex, 0), Math.max(photos.length - 1, 0))
      setCurrentIndex(boundedIndex)
    }
  }, [isOpen, initialIndex, photos.length])

  if (!isOpen) return null

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1))
  }

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1))
  }

  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" />

      {/* Modal Content */}
      <div className="relative z-10 w-full max-w-6xl mx-4" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-white">
            <Grid className="w-5 h-5" />
            <span className="text-sm font-medium">{currentIndex + 1} / {photos.length}</span>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Main Photo */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          <Image
            src={photos[currentIndex].photoUrl}
            alt={`Photo ${currentIndex + 1}`}
            fill
            className="object-contain"
            priority
          />

          {/* Navigation Arrows */}
          {photos.length > 1 && (
            <>
              <button
                onClick={goToPrevious}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={goToNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnail Strip */}
        {photos.length > 1 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {photos.map((photo, index) => (
              <button
                key={photo.id}
                onClick={() => setCurrentIndex(index)}
                className={`relative w-20 h-16 rounded-lg overflow-hidden flex-shrink-0 transition ${
                  index === currentIndex
                    ? "ring-2 ring-[#1a3c34]"
                    : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={photo.photoUrl}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
