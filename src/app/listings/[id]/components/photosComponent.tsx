

"use client"
import { useState } from "react"
import PhotoModal from "./photoModal"



export default function PhotosComponent({ photoCount ,photos}: { photoCount: number ,photos: { id: string; photoUrl: string; displayOrder: number }[]}) {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handlePhotoModalClicked = () => { 
        setIsModalOpen(true);
    }
  return (
    <div>
   <div className="flex h-36 items-center justify-center rounded-lg bg-[#184f43] text-emerald-100" cursor-pointer="true" onClick={handlePhotoModalClicked}>
                  View all {photoCount} photos
                </div>

            {isModalOpen && (
                <PhotoModal photos={photos} onClose={() => setIsModalOpen(false)} isOpen={isModalOpen} />
            )}



</div>
  )
}