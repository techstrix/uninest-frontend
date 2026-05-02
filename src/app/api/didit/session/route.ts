import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"

export async function POST() {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const apiKey = process.env.DIDIT_API_KEY
    const workflowId = process.env.DIDIT_WORKFLOW_ID

    if (!apiKey) {
      return NextResponse.json({ error: "DIDIT_API_KEY is not configured." }, { status: 500 })
    }

    if (!workflowId) {
      return NextResponse.json({ error: "DIDIT_WORKFLOW_ID is not configured." }, { status: 500 })
    }

    const client = await clerkClient()
    const clerkUser = await client.users.getUser(userId)
    const landlordEmail = clerkUser.emailAddresses[0]?.emailAddress

    if (!landlordEmail) {
      return NextResponse.json({ error: "Missing user email." }, { status: 400 })
    }

    const response = await fetch("https://verification.didit.me/v3/session/", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        workflow_id: workflowId,
        vendor_data: landlordEmail,
        callback: `http://localhost:3000/verify-success`,
        callback_method: "both",
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Failed to create Didit session", data)
      return NextResponse.json({ error: data?.error || data?.message || "Failed to start verification." }, { status: response.status })
    }

    return NextResponse.json({ url: data?.url ?? data?.verification_url ?? data?.session_url })
  } catch (error) {
    console.error("Didit session error", error)
    return NextResponse.json({ error: "Failed to start verification." }, { status: 500 })
  }
}
