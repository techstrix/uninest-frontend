"use server"

import { Resend } from "resend"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

//TODO:Fix here Very dang but I will fix later since for some reason I cant figure out how to use envs cor vzr.
const resendApiKey = "re_b8wkZsth_CkeSbiqhC14g99kUq3vf6RSt"
const resend = resendApiKey ? new Resend(resendApiKey) : null
const fromEmail = "onboarding@resend.dev"

type ModerateFraudReportInput = {
  reportId: string
  action: "suspend-listing" | "reject-report"
  reason: string
}

export async function moderateFraudReport({ reportId, action, reason }: ModerateFraudReportInput) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const adminReason = reason.trim()
  if (adminReason.length < 10) {
    throw new Error("Please provide a detailed reason.")
  }

  if (!resend) {
    throw new Error("RESEND_API_KEY is not configured.")
  }

  const report = await prisma.fraudReport.findUnique({
    where: { id: reportId },
    include: {
      listing: {
        include: {
          landlord: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      reportedBy: {
        select: {
          firstName: true,
          lastName: true,
          username: true,
          email: true,
        },
      },
    },
  })

  if (!report) {
    throw new Error("Report not found.")
  }

  const reporterName = formatUserName(report.reportedBy.firstName, report.reportedBy.lastName, report.reportedBy.username)
  const landlordUser = report.listing.landlord.user
  const landlordName = formatUserName(landlordUser.firstName, landlordUser.lastName, landlordUser.username)

  if (action === "suspend-listing") {
    await prisma.listing.update({
      where: { id: report.listingId },
      data: { status: "inactive" },
    })

    await resend.emails.send({
      from: fromEmail,
      to: landlordUser.email,
      subject: `Your UniNest listing has been suspended: ${report.listing.title}`,
      html: buildSuspensionEmail({ landlordName, listingTitle: report.listing.title, reason: adminReason }),
      text: buildSuspensionEmailText({ landlordName, listingTitle: report.listing.title, reason: adminReason }),
    })

    await prisma.fraudReport.update({
      where: { id: reportId },
      data: { status: "resolved" },
    })

    return { ok: true }
  }

  await resend.emails.send({
    from: fromEmail,
    to: report.reportedBy.email,
    subject: `Update on your UniNest fraud report for ${report.listing.title}`,
    html: buildRejectionEmail({ reporterName, listingTitle: report.listing.title, reason: adminReason }),
    text: buildRejectionEmailText({ reporterName, listingTitle: report.listing.title, reason: adminReason }),
  })

  await prisma.fraudReport.delete({
    where: { id: reportId },
  })

  return { ok: true }
}

function formatUserName(firstName: string | null, lastName: string | null, username: string) {
  return `${firstName ?? ""} ${lastName ?? ""}`.trim() || username
}

function buildSuspensionEmail({ landlordName, listingTitle, reason }: { landlordName: string; listingTitle: string; reason: string }) {
  return `
    <p>Dear ${escapeHtml(landlordName)},</p>
    <p>Your listing <strong>${escapeHtml(listingTitle)}</strong> has been suspended following a review by the UniNest moderation team.</p>
    <p><strong>Reason provided by the administrator:</strong><br />${escapeHtml(reason)}</p>
    <p>This action has been taken to protect users and maintain platform safety. If you believe this decision was made in error, you may reply to this email with additional information or supporting evidence for an appeal.</p>
    <p>Regards,<br />UniNest Admin Team</p>
  `
}

function buildSuspensionEmailText({ landlordName, listingTitle, reason }: { landlordName: string; listingTitle: string; reason: string }) {
  return [
    `Dear ${landlordName},`,
    "",
    `Your listing "${listingTitle}" has been suspended following a review by the UniNest moderation team.`,
    "",
    `Reason provided by the administrator: ${reason}`,
    "",
    "This action has been taken to protect users and maintain platform safety. If you believe this decision was made in error, you may reply to this email with additional information or supporting evidence for an appeal.",
    "",
    "Regards,",
    "UniNest Admin Team",
  ].join("\n")
}

function buildRejectionEmail({ reporterName, listingTitle, reason }: { reporterName: string; listingTitle: string; reason: string }) {
  return `
    <p>Dear ${escapeHtml(reporterName)},</p>
    <p>Thank you for taking the time to submit your report regarding <strong>${escapeHtml(listingTitle)}</strong>.</p>
    <p>After a review of the details provided, we have decided not to proceed with this report.</p>
    <p><strong>Reason provided by the administrator:</strong><br />${escapeHtml(reason)}</p>
    <p>We appreciate your help in keeping UniNest safe and encourage you to continue reporting anything that appears suspicious in the future.</p>
    <p>Regards,<br />UniNest Admin Team</p>
  `
}

function buildRejectionEmailText({ reporterName, listingTitle, reason }: { reporterName: string; listingTitle: string; reason: string }) {
  return [
    `Dear ${reporterName},`,
    "",
    `Thank you for taking the time to submit your report regarding ${listingTitle}.`,
    "",
    "After a review of the details provided, we have decided not to proceed with this report.",
    "",
    `Reason provided by the administrator: ${reason}`,
    "",
    "We appreciate your help in keeping UniNest safe and encourage you to continue reporting anything that appears suspicious in the future.",
    "",
    "Regards,",
    "UniNest Admin Team",
  ].join("\n")
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}
