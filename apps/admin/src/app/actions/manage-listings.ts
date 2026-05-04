"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function suspendListing(listingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.listing.update({
    where: { id: listingId },
    data: { status: "inactive" },
  })
}

export async function deleteListing(listingId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.listing.delete({
    where: { id: listingId },
  })
}
