import Link from "next/link"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Camera, CheckCircle2, Clock3 } from "lucide-react"
import { UniNestWordmark } from "@/components/brand/uninest-wordmark"
import ListingsManager, { type DashboardListing } from "./listings-manager"
import ProfileMenu from "./profile-menu"
import PhoneVerificationReminder from "@/components/phone-verification-reminder"

type ListingCard = DashboardListing & {
  id: string
  campusMinutes: number | null
  campusLabel: string
  views: number
  expiresAt: string | null
  expiresAtDate: string | null
}

type DashboardPageProps = {
  searchParams?: Promise<{ tab?: string }>
}

function getNearestCampus(listing: {
  mainWalkingMinutes: number | null
  chiromoWalkingMinutes: number | null
  parklandsWalkingMinutes: number | null
}) {
  const options = [
    { label: "Main", minutes: listing.mainWalkingMinutes },
    { label: "Chiromo", minutes: listing.chiromoWalkingMinutes },
    { label: "Parklands", minutes: listing.parklandsWalkingMinutes },
  ].filter((item): item is { label: string; minutes: number } => item.minutes !== null)

  if (options.length === 0) return { label: "-", minutes: null }

  return options.reduce((shortest, current) => (current.minutes < shortest.minutes ? current : shortest))
}

export default async function LandlordDashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {}
  const activeTab = resolvedSearchParams.tab ?? "listings"

  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) redirect("/home")

  const role = user?.publicMetadata?.role
  if (!role) redirect("/complete-profile")
  if (role !== "landlord") redirect("/home")

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId },
    select: {
      isLandlordVerified: true,
      verificationStatus: true,
      isIdVerified: true,
    },
  })

  if (!landlordProfile) redirect("/complete-profile")
  if (!landlordProfile.isLandlordVerified) redirect("/verify-success")

  const profileData = await prisma.landlordProfile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          profilePhoto: true,
          phone: true,
        },
      },
      listings: {
        include: {
          photos: {
            orderBy: { displayOrder: "asc" },
          },
          reviews: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              rating: true,
              comment: true,
              createdAt: true,
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!profileData) redirect("/complete-profile")
  if (!profileData.user.profilePhoto) redirect("/landlord-dashboard/complete-photo")

  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)

  const listingIds = profileData.listings.map((listing) => listing.id)
  const listingViewCountById = new Map<string, number>()

  if (listingIds.length > 0) {
    const viewCounts = await prisma.listingView.groupBy({
      by: ["listingId"],
      where: { listingId: { in: listingIds } },
      _count: { _all: true },
    })

    viewCounts.forEach((item) => {
      listingViewCountById.set(item.listingId, item._count._all)
    })
  }

  const now = new Date()
  const sevenDaysAgo = new Date(now)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const recentViews = listingIds.length > 0
    ? await prisma.listingView.findMany({
        where: { listingId: { in: listingIds }, createdAt: { gte: sevenDaysAgo } },
        select: { createdAt: true },
      })
    : []

  const viewBuckets = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const date = new Date(sevenDaysAgo)
    date.setDate(sevenDaysAgo.getDate() + i)
    viewBuckets.set(date.toISOString().slice(0, 10), 0)
  }

  recentViews.forEach((view) => {
    const key = new Date(view.createdAt).toISOString().slice(0, 10)
    viewBuckets.set(key, (viewBuckets.get(key) ?? 0) + 1)
  })

  const viewTrend = Array.from(viewBuckets.entries()).map(([date, value]) => ({
    key: date,
    label: new Date(date).toLocaleDateString("en-US", { weekday: "short" }),
    value,
  }))

  const contactRevealsThisWeek = listingIds.length > 0
    ? await prisma.contactReveal.count({
        where: { listingId: { in: listingIds }, revealedAt: { gte: sevenDaysAgo } },
      })
    : 0

  const prevWeekStart = new Date(sevenDaysAgo)
  prevWeekStart.setDate(prevWeekStart.getDate() - 7)
  const contactRevealsLastWeek = listingIds.length > 0
    ? await prisma.contactReveal.count({
        where: {
          listingId: { in: listingIds },
          revealedAt: { gte: prevWeekStart, lt: sevenDaysAgo },
        },
      })
    : 0

  const allReviews = profileData.listings.flatMap((listing) =>
    listing.reviews.map((review) => ({
      id: review.id,
      listingId: listing.id,
      listingTitle: listing.title,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
      studentName: `${review.student.firstName ?? ""} ${review.student.lastName ?? ""}`.trim() || "Student",
      studentPhoto: review.student.profilePhoto,
    })),
  )

  const averageReviewRating = allReviews.length > 0 ? allReviews.reduce((sum, review) => sum + review.rating, 0) / allReviews.length : null

  const listings: ListingCard[] = profileData.listings.map((listing) => {
    const listingWithExpiry = listing as typeof listing & { expiresAt?: Date | null }
    const nearestCampus = getNearestCampus(listingWithExpiry)

    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      address: listing.address,
      price: Number(listing.price),
      deposit: listing.deposit === null ? null : Number(listing.deposit),
      bedroomType: listing.bedroomType,
      status: listing.status,
      mainWalkingMinutes: listing.mainWalkingMinutes,
      chiromoWalkingMinutes: listing.chiromoWalkingMinutes,
      parklandsWalkingMinutes: listing.parklandsWalkingMinutes,
      campusMinutes: nearestCampus.minutes,
      campusLabel: nearestCampus.label,
      views: listingViewCountById.get(listing.id) ?? 0,
      expiresAt: listingWithExpiry.expiresAt ? listingWithExpiry.expiresAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null,
      expiresAtDate: listingWithExpiry.expiresAt?.toISOString() ?? null,
      photoUrl: listing.photos[0]?.photoUrl ?? null,
      photos: listing.photos.map((photo) => ({ id: photo.id, photoUrl: photo.photoUrl, displayOrder: photo.displayOrder })),
    }
  })

  const activeListings = listings.filter((listing) => listing.status.toLowerCase() === "active")
  const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0)
  const firstName = profileData.user.firstName ?? clerkUser.firstName ?? ""
  const lastName = profileData.user.lastName ?? clerkUser.lastName ?? ""
  const fullName = `${firstName} ${lastName}`.trim() || "Landlord"
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? ""
  const linkedPhone = profileData.user.phone ?? null
  const isIdVerified = landlordProfile?.isIdVerified ?? true
  const profilePhoto = profileData.user.profilePhoto ?? null

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <header className="border-b border-[#143d33] bg-[#184f43] text-white">
        <div className="mx-auto max-w-310 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <Link href="/home" className="mt-1 inline-flex shrink-0">
                <UniNestWordmark className="text-[28px]" />
              </Link>
              <div>
                <h1 className="text-[26px] font-bold text-white">My Listings</h1>
                <p className="text-sm text-emerald-100/75">Manage your active properties and track performance</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-start">
              <ProfileMenu fullName={fullName} email={email} profilePhoto={profilePhoto} variant="light" />
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-310 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <PhoneVerificationReminder phoneNumber={linkedPhone} />

            {!profilePhoto ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <Camera className="h-5 w-5 text-[#dc2626]" />
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Upload your profile photo to continue</h2>
                    <p className="text-sm text-slate-600">Landlords must upload a profile photo before using the dashboard.</p>
                  </div>
                </div>
                <Link href="/landlord-dashboard/complete-photo" className="mt-4 inline-flex rounded-xl bg-[#dc2626] px-4 py-2 text-sm font-semibold text-white">Upload photo</Link>
              </div>
            ) : null}

            <QuickActionsStrip />

            <section id="overview" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4 scroll-mt-6">
              <SummaryCard value={String(activeListings.length)} label="Active Listings" sublabel="All live" />
              <SummaryCard value={String(totalViews)} label="Total Views" sublabel="7 days" />
              <SummaryCard value={String(contactRevealsThisWeek)} label="Contact Reveals" sublabel={`${contactRevealsLastWeek} last week`} />
            </section>

            <section id="views" className="grid gap-4 xl:grid-cols-[1.5fr_1fr] scroll-mt-6">
              <DashboardCard title="Views over time" subtitle="Past 7 days">
                <SimpleBarChart data={viewTrend} />
              </DashboardCard>
              <DashboardCard title="Recent activity" subtitle="Live feed">
                <div className="space-y-3 text-sm">
                  <FeedItem title="Views this week" body={`${totalViews} listing views across your dashboard`} />
                  <FeedItem title="Contact reveals" body={`${contactRevealsThisWeek} students revealed contact details`} />
                  <FeedItem title="Account status" body={profilePhoto ? "Profile photo uploaded" : "Profile photo still required"} />
                </div>
              </DashboardCard>
            </section>

            <section id="listing-views" className="grid gap-4 xl:grid-cols-[1.2fr_1fr] scroll-mt-6">
              <DashboardCard title="Views per listing" subtitle="At a glance">
                <ListingViewsBars listings={listings} />
              </DashboardCard>
              <DashboardCard id="verification" title="Verification" subtitle="What’s complete">
                <VerificationCard hasPhone={Boolean(linkedPhone)} hasId={isIdVerified} hasPhoto={Boolean(profilePhoto)} />
              </DashboardCard>
            </section>

            <section id="reviews" className="scroll-mt-6">
              <DashboardCard title="Reviews" subtitle="What students are saying">
                <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[#f4faf8] px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Average rating</div>
                    <div className="text-sm text-slate-500">Across all listings</div>
                  </div>
                  <div className="text-2xl font-bold text-[#1f5a48]">{averageReviewRating ? averageReviewRating.toFixed(1) : "-"}</div>
                </div>

                <div className="space-y-3">
                  {allReviews.length > 0 ? (
                    allReviews.slice(0, 6).map((review) => (
                      <div key={review.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#184f43] text-white">
                            {review.studentPhoto ? <img src={review.studentPhoto} alt={review.studentName} className="h-full w-full object-cover" /> : <span className="text-xs font-bold">{review.studentName.slice(0, 2).toUpperCase()}</span>}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <div className="font-semibold text-slate-900">{review.studentName}</div>
                                <div className="text-xs text-slate-500">{review.listingTitle}</div>
                              </div>
                              <div className="text-sm font-semibold text-[#1f5a48]">{review.rating}/5</div>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment ?? "No comment left."}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-6 text-sm text-slate-500">
                      No reviews yet.
                    </div>
                  )}
                </div>
              </DashboardCard>
            </section>

            <section id="expiry" className="scroll-mt-6">
              <DashboardCard title="Expiry countdown" subtitle="Based on payment date">
                <div className="space-y-4">
                  {listings.slice(0, 3).map((listing) => {
                    const expiresAt = listing.expiresAtDate ? new Date(listing.expiresAtDate) : null
                    const nowMs = new Date().getTime()
                    const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - nowMs) / (1000 * 60 * 60 * 24))) : null
                    const progress = daysLeft === null ? 0 : Math.max(0, Math.min(100, ((30 - daysLeft) / 30) * 100))
                    return (
                      <div key={listing.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-slate-900">{listing.title}</div>
                            <div className="text-sm text-slate-500">{daysLeft === null ? "No expiry set" : `${daysLeft} days remaining`}</div>
                          </div>
                          <Clock3 className="h-5 w-5 text-amber-600" />
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500" style={{ width: `${progress}%` }} />
                        </div>
                        <button className="mt-3 rounded-lg bg-[#dc2626] px-3 py-1.5 text-sm font-semibold text-white">Renew</button>
                      </div>
                    )
                  })}
                </div>
              </DashboardCard>
            </section>

            <section id="active-listings" className="scroll-mt-6">
              {activeTab === "listings" ? <ListingsManager listings={listings} /> : null}
            </section>
        </div>
      </main>
    </div>
  )
}

function SummaryCard({ value, label, sublabel }: { value: string; label: string; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="text-4xl font-bold text-slate-900">{value}</div>
      <div className="mt-2 text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-900">↑ {sublabel}</div>
    </div>
  )
}

function QuickActionsStrip() {
  const actions = [
    { label: "New Listing", href: "/post-listing" },
    { label: "Active Listings", href: "#active-listings" },
    { label: "Expiry", href: "#expiry" },
    { label: "Verification", href: "#verification" },
    { label: "Reviews", href: "#reviews" },
  ]

  return (
    <div className="flex flex-wrap gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
      {actions.map((action) => (
        <Link key={action.label} href={action.href} className="rounded-full bg-[#f4faf8] px-4 py-2 text-sm font-semibold text-[#1f5a48] transition hover:bg-[#e6f2ed]">
          {action.label}
        </Link>
      ))}
    </div>
  )
}

function DashboardCard({ id, title, subtitle, children }: { id?: string; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function SimpleBarChart({ data }: { data: { key: string; label: string; value: number }[] }) {
  const max = Math.max(...data.map((item) => item.value), 1)
  return (
    <div className="flex h-56 items-end gap-2">
      {data.map((item) => (
        <div key={item.key} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full items-end justify-center">
            <div className="w-full max-w-8 rounded-t-xl bg-[#1f5a48]" style={{ height: `${Math.max((item.value / max) * 180, item.value > 0 ? 8 : 2)}px` }} />
          </div>
          <div className="text-xs font-semibold text-slate-500">{item.label}</div>
          <div className="text-xs text-slate-400">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

function ListingViewsBars({ listings }: { listings: ListingCard[] }) {
  const max = Math.max(...listings.map((listing) => listing.views), 1)
  return (
    <div className="space-y-4">
      {listings.map((listing) => (
        <div key={listing.id} className="space-y-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-900">{listing.title}</span>
            <span className="text-slate-500">{listing.views} views</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#1f5a48]" style={{ width: `${(listing.views / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function VerificationCard({ hasPhone, hasId, hasPhoto }: { hasPhone: boolean; hasId: boolean; hasPhoto: boolean }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2 text-sm">
        <TrustItem label="Phone verified" done={hasPhone} />
        <TrustItem label="ID verified" done={hasId} />
        <TrustItem label="Profile photo uploaded" done={hasPhoto} />
      </div>
    </div>
  )
}

function TrustItem({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2 className={done ? "h-4 w-4 text-emerald-600" : "h-4 w-4 text-slate-300"} />
      <span className={done ? "text-slate-900" : "text-slate-500"}>{label}</span>
    </div>
  )
}

function FeedItem({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="text-sm text-slate-500">{body}</div>
    </div>
  )
}
