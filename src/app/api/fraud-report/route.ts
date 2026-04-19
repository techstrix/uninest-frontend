import { auth } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import { prisma } from "@/lib/prisma"

const MAX_EVIDENCE_FILES = 5
const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
const ALLOWED_EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"])

function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), "public", "uploads", "fraud-reports")

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
  }

  return uploadDir
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const listingId = String(formData.get("listingId") ?? "").trim()
    const category = String(formData.get("category") ?? "").trim()
    const reason = String(formData.get("reason") ?? "").trim()
    const visitedProperty = String(formData.get("visitedProperty") ?? "").toLowerCase() === "yes"
    const acknowledged = String(formData.get("acknowledged") ?? "").toLowerCase() === "true"

    if (!listingId) {
      return NextResponse.json({ error: "listingId is required" }, { status: 400 })
    }

    if (!category) {
      return NextResponse.json({ error: "Please select a report category." }, { status: 400 })
    }

    if (reason.length < 10) {
      return NextResponse.json({ error: "Please provide a more detailed reason." }, { status: 400 })
    }

    if (!acknowledged) {
      return NextResponse.json({ error: "Please confirm the acknowledgement checkbox." }, { status: 400 })
    }

    const listing = await prisma.listing.findUnique({
      where: { id: listingId },
      select: {
        id: true,
        title: true,
        address: true,
        price: true,
        photos: {
          orderBy: { displayOrder: "asc" },
          select: { photoUrl: true },
        },
      },
    })

    if (!listing) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 })
    }

    const evidenceFiles = formData
      .getAll("evidenceFiles")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0)

    if (evidenceFiles.length > MAX_EVIDENCE_FILES) {
      return NextResponse.json({ error: "You can upload a maximum of 5 files." }, { status: 400 })
    }

    const uploadDir = ensureUploadDir()
    const evidenceUrls: string[] = []

    for (let i = 0; i < evidenceFiles.length; i += 1) {
      const file = evidenceFiles[i]

      if (!ALLOWED_EVIDENCE_TYPES.has(file.type)) {
        return NextResponse.json({ error: "Only JPG, PNG, and PDF files are allowed." }, { status: 400 })
      }

      if (file.size > MAX_EVIDENCE_BYTES) {
        return NextResponse.json({ error: "Each file must be 10MB or less." }, { status: 400 })
      }

      const safeName = file.name.replace(/\s+/g, "-")
      const fileName = `${Date.now()}-${i}-${safeName}`
      const filePath = path.join(uploadDir, fileName)

      const bytes = await file.arrayBuffer()
      fs.writeFileSync(filePath, Buffer.from(bytes))
      evidenceUrls.push(`/uploads/fraud-reports/${fileName}`)
    }

    await prisma.fraudReport.create({
      data: {
        listingId,
        reportedById: userId,
        category,
        reason,
        evidenceUrls,
        visitedProperty,
        acknowledged,
      },
    })

    return NextResponse.json({ ok: true, listing })
  } catch (error) {
    console.error("Failed to submit fraud report", error)
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
