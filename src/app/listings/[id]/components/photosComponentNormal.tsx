"use client"
import { useState } from "react"
import PhotoModal from "./photoModal"
import Image from "next/image"

type Photo = {
  id: string
  photoUrl: string
  displayOrder: number
}

export default function PhotosComponentNormal({ 
  listingTitle, 
  photo,
  photos,
  initialIndex,
  heightClass = "h-36",
  moreCount = 0
}: { 
  listingTitle: string, 
  photo?: Photo,
  photos?: Photo[],
  initialIndex?: number,
  heightClass?: string,
  moreCount?: number
}) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const modalPhotos = photos && photos.length > 0 ? photos : photo ? [photo] : []
  const startIndex =
    typeof initialIndex === "number"
      ? initialIndex
      : photo
      ? Math.max(
          0,
          modalPhotos.findIndex((item) => item.id === photo.id)
        )
      : 0

  return (
    <div 
      className={`relative ${heightClass} overflow-hidden rounded-lg bg-[#184f43] ${modalPhotos.length > 0 ? "cursor-pointer" : ""}`}
      onClick={() => {
        if (modalPhotos.length > 0) {
          setIsModalOpen(true)
        }
      }}
    >
      {photo ? (
        <Image 
          src={photo.photoUrl} 
          alt={listingTitle} 
          fill 
          className="object-cover hover:scale-105 transition-transform" 
        />
      ) : (
        <div className="flex h-full items-center justify-center text-5xl">🏠</div>
      )}
      
      {moreCount > 0 && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-md">
          +{moreCount} more
        </div>
      )}

      {isModalOpen && (
        <PhotoModal photos={modalPhotos} initialIndex={startIndex} onClose={() => setIsModalOpen(false)} isOpen={isModalOpen} />
      )}
    </div>
  )
}
