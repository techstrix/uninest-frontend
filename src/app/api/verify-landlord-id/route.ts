import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const apiKey = process.env.DIDIT_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "DIDIT_API_KEY is not configured." }, { status: 500 })
    }

    const formData = await request.formData()
    const front = formData.get("front")
    const back = formData.get("back")

    if (!(front instanceof File) || !(back instanceof File)) {
      return NextResponse.json({ error: "Please upload both the front and back of your ID." }, { status: 400 })
    }

    const diditForm = new FormData()
    diditForm.append("front_image", front)
    diditForm.append("back_image", back)
    diditForm.append("save_api_request", "true")
    diditForm.append("perform_document_liveness", "false")

    const response = await fetch("https://verification.didit.me/v3/id-verification/", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: diditForm,
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Didit verification failed", {
        status: response.status,
        body: data,
      })

      return NextResponse.json(
        {
          error: data?.error || data?.message || "Verification failed.",
        },
        { status: response.status },
      )
    }

    const status = String(data?.id_verification?.status ?? "").toLowerCase()

    return NextResponse.json({
      recommendation: status === "approved" ? "Approved" : status === "declined" ? "Declined" : "Review",
      confidence: data?.id_verification?.age ?? "-",
      issues: Array.isArray(data?.id_verification?.warnings)
        ? data.id_verification.warnings.map((warning: { short_description?: string }) => warning.short_description).filter(Boolean)
        : [],
      raw: data,
    })
  } catch (error) {
    console.error("Landlord ID verification error", error)
    return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 })
  }
}
