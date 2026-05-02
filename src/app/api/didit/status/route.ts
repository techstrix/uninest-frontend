import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const landlordProfile = await prisma.landlordProfile.findUnique({
      where: { userId },
      select: {
        isLandlordVerified: true,
        verificationStatus: true,
      },
    })

    return NextResponse.json({
      isLandlordVerified: landlordProfile?.isLandlordVerified ?? false,
      status: landlordProfile?.verificationStatus ?? "pending",
    })
  } catch (error) {
    console.error("Didit status error", error)
    return NextResponse.json({ error: "Failed to load verification status." }, { status: 500 })
  }
}
