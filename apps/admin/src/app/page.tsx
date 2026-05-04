import { auth } from "@/auth"
import { redirect } from "next/navigation"
import ProfileMenu from "./components/profile-menu"
import { prisma } from "@/lib/prisma"
import { FraudReportsPanel, type AdminFraudReport } from "./components/profile-menu"
import LandlordListingsManager from "./components/landlord-search-panel"

const recentRegistrations = [
  {
    name: "Faith Muthoni",
    email: "faith.m@students.uonbi.ac.ke",
    role: "Student",
    verification: "—",
    joined: "28 Feb 2026",
    status: "Active",
  },
  {
    name: "Peter Kamau",
    email: "p.kamau@gmail.com",
    role: "Landlord",
    verification: "ID Verified",
    joined: "25 Feb 2026",
    status: "Active",
  },
  {
    name: "David Ochieng",
    email: "d.ochieng@gmail.com",
    role: "Landlord",
    verification: "Pending ID",
    joined: "24 Feb 2026",
    status: "Active",
  },
]

export default async function AdminHomePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/sign-in")
  }

  const fullName = session.user.name?.trim() || "Admin User"
  const email = session.user.email ?? "admin@uninest.com"
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const openReportsCount = await prisma.fraudReport.count({
    where: { status: { in: ["pending", "open", "under_review"] } },
  })

  const rawFraudReports = await prisma.fraudReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          address: true,
          price: true,
          status: true,
          photos: {
            orderBy: { displayOrder: "asc" },
            select: { photoUrl: true },
          },
        },
      },
      reportedBy: {
        select: {
          id: true,
          username: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
    },
  })

  const fraudReports: AdminFraudReport[] = rawFraudReports.map((report) => {
    const evidenceUrls = Array.isArray(report.evidenceUrls) ? report.evidenceUrls.filter((entry): entry is string => typeof entry === "string") : []
    const reporterName = `${report.reportedBy.firstName ?? ""} ${report.reportedBy.lastName ?? ""}`.trim() || report.reportedBy.username || "Unknown Reporter"

    return {
      id: report.id,
      category: report.category,
      reason: report.reason,
      status: report.status,
      visitedProperty: report.visitedProperty,
      acknowledged: report.acknowledged,
      createdAt: report.createdAt.toISOString(),
      evidenceUrls,
      listing: {
        id: report.listing.id,
        title: report.listing.title,
        address: report.listing.address,
        price: Number(report.listing.price),
        status: report.listing.status,
        photoUrl: report.listing.photos[0]?.photoUrl ?? null,
      },
      reporter: {
        id: report.reportedBy.id,
        name: reporterName,
        username: report.reportedBy.username,
        email: report.reportedBy.email,
        phone: report.reportedBy.phone,
      },
    }
  })

  const landlords = await prisma.landlordProfile.findMany({
    orderBy: { user: { createdAt: "desc" } },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          phone: true,
          createdAt: true,
        },
      },
      listings: {
        select: {
          id: true,
          title: true,
          address: true,
          price: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  const landlordSearchData = landlords.map((item) => ({
    id: item.id,
    userId: item.userId,
    name: `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || item.user.username || "Landlord",
    username: item.user.username,
    email: item.user.email,
    phone: item.user.phone,
    verified: item.isLandlordVerified,
    trustScore: item.trustScore,
    listings: item.listings.map((listing) => ({
      id: listing.id,
      title: listing.title,
      address: listing.address,
      price: Number(listing.price),
      status: listing.status,
    })),
  }))

  const summaryCards = [
    { value: "142", label: "Total Users", sublabel: "+8 this week", tone: "text-slate-900" },
    { value: "67", label: "Active Listings", sublabel: "+5 today", tone: "text-slate-900" },
    { value: String(openReportsCount), label: "Open Reports", sublabel: "Needs action", tone: "text-red-500" },
    { value: "18", label: "Landlords", sublabel: "Managed accounts", tone: "text-slate-900" },
  ]

  return (
    <div className="min-h-screen bg-[#d8dde5]">
      <div className="flex min-h-screen bg-[#f8fafc]">
        <aside className="hidden w-60 shrink-0 flex-col bg-[#0f1b34] text-white lg:flex">
          <div className="border-b border-white/10 px-6 py-6">
            <p className="text-[30px] font-extrabold tracking-tight">
              <span className="text-[#68a6ff]">Uni</span>Nest
              <span className="ml-2 text-xs font-bold uppercase tracking-[0.18em] text-white/60">Admin</span>
            </p>
          </div>

          <div className="px-4 pt-5">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Overview</p>
              <nav className="mt-2 space-y-1">
                <SidebarItem label="Dashboard" active />
                <SidebarItem label="Reports" badge={String(openReportsCount)} />
              </nav>
          </div>

          <div className="mt-6 px-4">
            <p className="px-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">Manage</p>
              <nav className="mt-2 space-y-1">
                <SidebarItem label="Users" />
                <SidebarItem label="Listings" />
                <SidebarItem label="Payments" />
              </nav>
          </div>

          <div className="mt-auto border-t border-white/10 px-4 py-4">
            <ProfileMenu fullName={fullName} email={email} initials={initials || "AD"} />
          </div>
        </aside>

        <main className="flex-1">
          <div className="border-b border-slate-200 bg-white/90 px-4 py-5 backdrop-blur sm:px-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
                <p className="text-sm text-slate-500">Platform overview - pending actions require your attention</p>
              </div>
              <p className="text-xs font-medium text-slate-500">Saturday, 28 Feb 2026</p>
            </div>
          </div>

          <div className="space-y-5 px-4 py-5 sm:px-6">
            <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {summaryCards.map((card) => (
                <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className={`text-4xl font-bold ${card.tone}`}>{card.value}</p>
                  <p className="mt-1 text-sm text-slate-500">{card.label}</p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">{card.sublabel}</p>
                </article>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-bold text-slate-900">Open Fraud Reports</h2>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">{openReportsCount} open</span>
                </div>
                <FraudReportsPanel reports={fraudReports} />
              </article>

              <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-bold text-slate-900">Listings</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">Landlord search</span>
                </div>
                <LandlordListingsManager landlords={landlordSearchData} />
              </article>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

function SidebarItem({ label, badge, active = false }: { label: string; badge?: string; active?: boolean }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
        active ? "bg-white/10 text-white" : "text-white/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span>{label}</span>
      {badge ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">{badge}</span> : null}
    </button>
  )
}
