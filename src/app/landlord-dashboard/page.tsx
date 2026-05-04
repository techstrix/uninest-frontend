import Link from "next/link"
import { UniNestWordmark } from "@/components/brand/uninest-wordmark"
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { Bell, Sparkles } from "lucide-react"
import ListingsManager, { type DashboardListing } from "./listings-manager"
import ProfileMenu from "./profile-menu"
import PhoneVerificationReminder from "@/components/phone-verification-reminder"

type ListingCard = DashboardListing & {
  id: string
  campusMinutes: number | null
  campusLabel: string
  views: number
  expiresAt: string | null
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

  const { userId} = await auth()
   const user   = await currentUser()

  if (!userId) {
    console.log("No user id found, redirecting to home...")
    redirect("/home")
  }

  const client = await clerkClient()

  const role = user?.publicMetadata?.role
  if (!role) {
    redirect("/complete-profile")
  }

  if (role !== "landlord") {
    redirect("/home")
  }

  const landlordProfile = await prisma.landlordProfile.findUnique({
    where: { userId },
    select: {
      isLandlordVerified: true,
      verificationStatus: true,
    },
  })

  if (!landlordProfile) {
    redirect("/complete-profile")
  }

  if (!landlordProfile.isLandlordVerified) {
    redirect("/verify-success")
  }

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
            orderBy: {
              displayOrder: "asc",
            },
          },
          reviews: {
            select: {
              rating: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  })

  const listingIds = profileData.listings.map((listing) => listing.id)
  const listingViewCountById = new Map<string, number>()

  if (listingIds.length > 0) {
    const viewCounts = await prisma.listingView.groupBy({
      by: ["listingId"],
      where: {
        listingId: { in: listingIds },
      },
      _count: {
        _all: true,
      },
    })

    viewCounts.forEach((item) => {
      listingViewCountById.set(item.listingId, item._count._all)
    })
  }

  const listings: ListingCard[] = profileData.listings.map((listing) => {
    const nearestCampus = getNearestCampus(listing)
    const expiry = new Date(listing.updatedAt)
    expiry.setDate(expiry.getDate() + 30)

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
      expiresAt: expiry.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      photoUrl: listing.photos[0]?.photoUrl ?? null,
      photos: listing.photos.map((photo) => ({
        id: photo.id,
        photoUrl: photo.photoUrl,
        displayOrder: photo.displayOrder,
      })),
    }
  })
  const clerkUser = await client.users.getUser(userId)

  const activeListings = listings.filter((listing) => listing.status.toLowerCase() === "active")
  const expiringSoon = listings.filter((listing) => listing.status.toLowerCase() === "expiring soon")
  const totalViews = listings.reduce((sum, listing) => sum + listing.views, 0)
  const unreadMessages = 3

  const firstName = profileData.user.firstName ?? clerkUser.firstName ?? ""
  const lastName = profileData.user.lastName ?? clerkUser.lastName ?? ""
  const fullName = `${firstName} ${lastName}`.trim() || "Landlord"
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const trustScore = profileData.trustScore
  const email = clerkUser.primaryEmailAddress?.emailAddress ?? clerkUser.emailAddresses[0]?.emailAddress ?? ""
  const linkedPhone = profileData.user.phone ?? null

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-65 shrink-0 flex-col border-r border-white/10 bg-[#1f5a48] text-white lg:flex">
          <div className="px-5 py-6">
            <UniNestWordmark className="text-2xl" />
          </div>

          <div className="mt-auto border-t border-white/10 px-4 py-5">
            <ProfileMenu fullName={fullName} initials={initials} email={email} />
          </div>
        </aside>

        <main className="flex-1">
          <header className="border-b border-gray-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-310 items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
              <div>
                <h1 className="text-[26px] font-bold text-slate-900">My Listings</h1>
                <p className="text-sm text-slate-500">Manage your active properties and track performance</p>
              </div>

              <div className="flex items-center gap-3">
                <button className="hidden h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-slate-600 sm:flex">
                  <Bell className="h-4 w-4" />
                </button>
                <Link
                  href="/post-listing"
                  className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#1f5a48] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#184738]"
                >
                  <Sparkles className="h-4 w-4 text-[#cb8cff]" />
                  New Listing
                </Link>
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-310 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
            <PhoneVerificationReminder phoneNumber={linkedPhone} />
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <SummaryCard value={String(activeListings.length)} label="Active Listings" sublabel="All live" />
              <SummaryCard value={String(totalViews)} label="Total Views" sublabel="This week" />
              <SummaryCard value={String(unreadMessages)} label="Enquiries" sublabel="3 unread" />
            </section>

            {activeTab === "listings" ? (
              <ListingsManager listings={listings} />
            ) : null}
          </div>
        </main>
      </div>
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

function StatusItem({ label, value, checked }: { label: string; value: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
      <div className={`flex h-7 w-7 items-center justify-center rounded-full ${checked ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
        {checked ? "✓" : "–"}
      </div>
      <div>
        <div className="text-sm font-semibold text-slate-900">{label}</div>
        <div className="text-sm text-slate-500">{value}</div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <span>{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  )
}
