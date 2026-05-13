import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : ""

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const existingReveal = await prisma.contactReveal.findFirst({
      where: {
        listingId,
        studentId: userId,
      },
      select: { id: true },
    })

    if (!existingReveal) {
      await prisma.contactReveal.create({
        data: {
          listingId,
          studentId: userId,
        },
      })
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: {
        landlord: {
          include: {
            user: {
              select: {
                phone: true,
                email: true,
              },
            },
          },
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    return NextResponse.json(
      {
        ok: true,
        contact: {
          phone: listing.landlord.user.phone ?? null,
          email: listing.landlord.user.email ?? null,
        },
      },
      { status: 200 },
    )
  } catch {
    return NextResponse.json({ error: "Failed to reveal contact" }, { status: 500 })
  }
}
