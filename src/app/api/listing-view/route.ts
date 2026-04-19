import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const listingId = typeof body?.listingId === "string" ? body.listingId.trim() : ""

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 })
    }

    const listingExists = await prisma.listing.findUnique({
      where: { id: listingId },
      select: { id: true },
    })

    if (!listingExists) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const { userId } = await auth()
    const requestHeaders = await headers()
    const forwarded = requestHeaders.get("x-forwarded-for")
    const ip = forwarded?.split(",")[0]?.trim() || null

    await prisma.$executeRaw`
      INSERT INTO "listing_views" ("id", "listing_id", "user_id", "ip", "created_at")
      VALUES (${crypto.randomUUID()}, ${listingId}, ${userId ?? null}, ${ip}, NOW())
    `

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to track view" }, { status: 500 })
  }
}
