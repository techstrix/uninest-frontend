"use server"

import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import fs from "fs"
import path from "path"

type ActionResult = {
  ok: boolean
  error?: string
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parsePrice(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null
  const parsed = Number.parseFloat(value)
  return Number.isNaN(parsed) ? null : parsed
}

async function saveUploadedPhotos(files: File[]) {
  const uploadDir = path.join(process.cwd(), "public/uploads")

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  const uploadedUrls: string[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    if (!file || file.size === 0) continue

    if (!file.type.startsWith("image/")) {
      throw new Error("Only image files are allowed.")
    }

    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Each photo should be 5MB or less.")
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const safeName = file.name.replace(/\s+/g, "-")
    const fileName = `${Date.now()}-${i}-${safeName}`
    const filePath = path.join(uploadDir, fileName)

    fs.writeFileSync(filePath, buffer)
    uploadedUrls.push(`/uploads/${fileName}`)
  }

  return uploadedUrls
}

async function saveUploadedProfilePhoto(file: File) {
  const uploadDir = path.join(process.cwd(), "public/uploads")

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.")
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profile photo should be 5MB or less.")
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const safeName = file.name.replace(/\s+/g, "-")
  const fileName = `${Date.now()}-${safeName}`
  const filePath = path.join(uploadDir, fileName)

  fs.writeFileSync(filePath, buffer)
  return `/uploads/${fileName}`
}

async function getOwnedListingId(listingId: string, userId: string) {
  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId },
    select: { id: true },
  })

  if (!landlordProfile) {
    return null
  }

  return prisma.listing.findFirst({
    where: {
      id: listingId,
      landlordId: landlordProfile.id,
    },
    select: { id: true },
  })
}

export async function updateListingAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not authenticated." }

  const listingId = formData.get("id")
  const title = formData.get("title")
  const address = formData.get("address")
  const status = formData.get("status")

  if (typeof listingId !== "string" || listingId.trim() === "") {
    return { ok: false, error: "Invalid listing id." }
  }

  if (typeof title !== "string" || title.trim() === "") {
    return { ok: false, error: "Title is required." }
  }

  if (typeof address !== "string" || address.trim() === "") {
    return { ok: false, error: "Address is required." }
  }

  if (typeof status !== "string" || status.trim() === "") {
    return { ok: false, error: "Status is required." }
  }

  const ownedListing = await getOwnedListingId(listingId, userId)
  if (!ownedListing) {
    return { ok: false, error: "Listing not found." }
  }

  const price = parsePrice(formData.get("price"))
  const deposit = parsePrice(formData.get("deposit"))

  if (price === null || price < 0) {
    return { ok: false, error: "Price must be a valid number." }
  }

  const keepPhotoIds = formData
    .getAll("keepPhotoIds")
    .filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "")

  const newPhotoFiles = formData
    .getAll("newPhotos")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  try {
    const uploadedUrls = await saveUploadedPhotos(newPhotoFiles)

    await prisma.$transaction(async (tx) => {
      const currentPhotos = await tx.listingPhoto.findMany({
        where: { listingId: ownedListing.id },
        orderBy: { displayOrder: "asc" },
        select: { id: true },
      })

      const currentPhotoIds = new Set(currentPhotos.map((photo) => photo.id))
      const filteredKeepIds = keepPhotoIds.filter((id) => currentPhotoIds.has(id))
      const totalPhotoCount = filteredKeepIds.length + uploadedUrls.length

      if (totalPhotoCount === 0) {
        throw new Error("At least one photo is required.")
      }

      if (totalPhotoCount > 5) {
        throw new Error("You can upload a maximum of 5 photos.")
      }

      await tx.listing.update({
        where: { id: ownedListing.id },
        data: {
          title: title.trim(),
          address: address.trim(),
          status: status.trim(),
          price,
          deposit,
          bedroomType: typeof formData.get("bedroomType") === "string" && formData.get("bedroomType")?.toString().trim() !== ""
            ? formData.get("bedroomType")!.toString().trim()
            : null,
          mainWalkingMinutes: parseOptionalInt(formData.get("mainWalkingMinutes")),
          chiromoWalkingMinutes: parseOptionalInt(formData.get("chiromoWalkingMinutes")),
          parklandsWalkingMinutes: parseOptionalInt(formData.get("parklandsWalkingMinutes")),
          description:
            typeof formData.get("description") === "string" && formData.get("description")?.toString().trim() !== ""
              ? formData.get("description")!.toString().trim()
              : null,
        },
      })

      if (filteredKeepIds.length > 0) {
        await tx.listingPhoto.deleteMany({
          where: {
            listingId: ownedListing.id,
            id: { notIn: filteredKeepIds },
          },
        })
      } else {
        await tx.listingPhoto.deleteMany({ where: { listingId: ownedListing.id } })
      }

      await Promise.all(
        filteredKeepIds.map((id, index) =>
          tx.listingPhoto.update({
            where: { id },
            data: { displayOrder: index },
          }),
        ),
      )

      if (uploadedUrls.length > 0) {
        await tx.listingPhoto.createMany({
          data: uploadedUrls.map((photoUrl, index) => ({
            listingId: ownedListing.id,
            photoUrl,
            displayOrder: filteredKeepIds.length + index,
          })),
        })
      }
    })
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update listing.",
    }
  }

  revalidatePath("/landlord-dashboard")
  return { ok: true }
}

export async function deleteListingAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await auth()
  if (!userId) return { ok: false, error: "Not authenticated." }

  const listingId = formData.get("id")
  if (typeof listingId !== "string" || listingId.trim() === "") {
    return { ok: false, error: "Invalid listing id." }
  }

  const ownedListing = await getOwnedListingId(listingId, userId)
  if (!ownedListing) {
    return { ok: false, error: "Listing not found." }
  }

  await prisma.listing.delete({ where: { id: ownedListing.id } })

  revalidatePath("/landlord-dashboard")
  return { ok: true }
}

export async function updateProfilePhotoAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await auth()

  if (!userId) {
    return { ok: false, error: "Not authenticated." }
  }

  const photo = formData.get("photo")
  if (!(photo instanceof File) || photo.size === 0) {
    return { ok: false, error: "Please choose a profile photo." }
  }

  try {
    const photoUrl = await saveUploadedProfilePhoto(photo)

    await prisma.user.update({
      where: { id: userId },
      data: { profilePhoto: photoUrl },
    })

    revalidatePath("/landlord-dashboard")
    revalidatePath("/listings")
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update profile photo.",
    }
  }
}
