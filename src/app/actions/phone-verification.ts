"use server"

import twilio from "twilio"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID

function normalizePhoneNumber(phoneNumber: string) {
  const trimmed = phoneNumber.trim().replace(/[\s-]/g, "")
  return trimmed.startsWith("+") ? trimmed : `+${trimmed}`
}

function isValidPhoneNumber(phoneNumber: string) {
  return /^\+[1-9]\d{7,14}$/.test(phoneNumber)
}

async function getAuthenticatedUserId() {
  const { userId } = await auth()
  if (!userId) {
    return null
  }

  return userId
}

export async function sendSMS_OTP(phoneNumber: string) {
  if (!serviceSid) {
    return { success: false, error: "Twilio verification is not configured." }
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  if (!isValidPhoneNumber(normalizedPhone)) {
    return { success: false, error: "Enter a valid phone number with country code." }
  }

  try {
    const verification = await client.verify.v2.services(serviceSid).verifications.create({
      to: normalizedPhone,
      channel: "sms",
    })

    return { success: true, status: verification.status, phoneNumber: normalizedPhone }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send verification code.",
    }
  }
}

export async function checkOTP(phoneNumber: string, code: string) {
  if (!serviceSid) {
    return { success: false, error: "Twilio verification is not configured." }
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  if (!isValidPhoneNumber(normalizedPhone)) {
    return { success: false, error: "Enter a valid phone number with country code." }
  }

  try {
    const verificationCheck = await client.verify.v2.services(serviceSid).verificationChecks.create({
      to: normalizedPhone,
      code,
    })

    if (verificationCheck.status === "approved") {
      return { success: true, phoneNumber: normalizedPhone }
    }

    return { success: false, error: "Invalid code" }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to verify code.",
    }
  }
}

export async function linkVerifiedPhone(phoneNumber: string) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return { success: false, error: "Unauthorized" }
  }

  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  if (!isValidPhoneNumber(normalizedPhone)) {
    return { success: false, error: "Enter a valid phone number with country code." }
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { phone: normalizedPhone },
    })

    await prisma.landlordProfile.updateMany({
      where: { userId },
      data: { isPhoneVerified: true },
    })

    return { success: true, phoneNumber: normalizedPhone }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save verified phone number.",
    }
  }
}
