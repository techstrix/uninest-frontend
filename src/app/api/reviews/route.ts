import { auth } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || user.role.toLowerCase() !== "student") {
      return NextResponse.json({ error: "Only students can leave reviews." }, { status: 403 })
    }

    const body = await request.json()
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : ""
    const comment = typeof body?.comment === "string" ? body.comment.trim() : ""
    const rating = Number(body?.rating)

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required." }, { status: 400 })
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 })
    }

    if (comment.length > 1000) {
      return NextResponse.json({ error: "Comment should be 1000 characters or less." }, { status: 400 })
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    })

    if (!listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 })
    }

    const existingReview = await prisma.review.findFirst({
      where: {
        listingId,
        studentId: userId,
      },
      select: { id: true },
    })

    if (existingReview) {
      await prisma.review.update({
        where: { id: existingReview.id },
        data: {
          rating,
          comment: comment.length > 0 ? comment : null,
        },
      })
    } else {
      await prisma.review.create({
        data: {
          listingId,
          studentId: userId,
          rating,
          comment: comment.length > 0 ? comment : null,
        },
      })
    }

    revalidatePath(`/listings/${listingId}`)
    revalidatePath("/landlord-dashboard")

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Failed to save review", error)
    return NextResponse.json({ error: "Failed to save review." }, { status: 500 })
  }
}
