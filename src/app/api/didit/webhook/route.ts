import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { clerkClient } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  try {
    const body = await request.text()
    const signature = request.headers.get("X-Signature-V2") ?? ""

    console.log("Didit webhook received", { signature, body })

    let payload: Record<string, unknown> = {}

    try {
      payload = body ? JSON.parse(body) : {}
    } catch {
      return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 })
    }

    const data = payload.data && typeof payload.data === "object" ? (payload.data as Record<string, unknown>) : {}
    const status = String(payload.status ?? payload.verification_status ?? data.status ?? "").toLowerCase().trim()
    const vendorData = String(payload.vendor_data ?? data.vendor_data ?? "").trim()

    if (!vendorData) {
      return NextResponse.json({ ok: true })
    }

    const user = await prisma.user.findUnique({
      where: { email: vendorData },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ ok: true })
    }

    const verified = status === "verified" || status === "approved" || status === "success"

    await prisma.landlordProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        isLandlordVerified: verified,
        verificationStatus: status || (verified ? "verified" : "pending"),
      },
      update: {
        isLandlordVerified: verified,
        verificationStatus: status || (verified ? "verified" : "pending"),
        isIdVerified: verified,
      },
    })

    if (verified) {
      const client = await clerkClient()
      await client.users.updateUserMetadata(user.id, {
        publicMetadata: {
          isLandlordVerified: true,
          verificationStatus: status || "verified",
        },
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Didit webhook error", error)
    return NextResponse.json({ error: "Webhook failed." }, { status: 500 })
  }
}
