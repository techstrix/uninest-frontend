import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { MapPin, ShieldCheck, Mail, Phone } from "lucide-react"
import { prisma } from "@/lib/prisma"
import PhotosComponent from "./components/photosComponent"

import PhotosComponentNormal from "./components/photosComponentNormal"
import ViewTracker from "./components/view-tracker"
import ListingMap from "./components/listing-map"


type PageProps = {
  params: Promise<{ id: string }>
}

const campusOrder = ["Main Campus", "Chiromo", "Parklands"] as const

export default async function ListingDetailsPage({ params }: PageProps) {
  const { id } = await params
  const mapboxAccessToken = process.env.MAPBOX_ACCESS_TOKEN ?? ""

  const listing = await prisma.listing.findUnique({
    where: { id },
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
      landlord: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            },
          },
        },
      },
    },
  })

  if (!listing) {
    notFound()
  }

  const distances = [
    { campus: "Main Campus", minutes: listing.mainWalkingMinutes },
    { campus: "Chiromo", minutes: listing.chiromoWalkingMinutes },
    { campus: "Parklands", minutes: listing.parklandsWalkingMinutes },
  ]

  const validDistances = distances.filter(
    (item): item is { campus: string; minutes: number } => item.minutes !== null && item.minutes >= 0
  )

  const nearest =
    validDistances.length > 0
      ? validDistances.reduce((shortest, current) =>
          current.minutes < shortest.minutes ? current : shortest
        )
      : null

  const ratingCount = listing.reviews.length
  const avgRating =
    ratingCount > 0
      ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount
      : null

  const landlordName = `${listing.landlord.user.firstName ?? ""} ${listing.landlord.user.lastName ?? ""}`.trim() || "Landlord"
  const initials = landlordName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("")

  const amenities = Array.isArray(listing.amenities)
    ? listing.amenities.filter((item): item is string => typeof item === "string")
    : []

  const typeLabel =
    listing.bedroomType === "ONE_BEDROOM"
      ? "1 Bedroom"
      : listing.bedroomType === "TWO_BEDROOM"
      ? "2 Bedroom"
      : listing.bedroomType === "THREE_BEDROOM"
      ? "3 Bedroom"
      : "Bedsitter"
    
  

  
  const heroPhoto = listing.photos[0]?.photoUrl
  const sidePhotos = listing.photos.slice(1, 3)
  const listingLat = listing.latitude ?? null
  const listingLng = listing.longitude ?? null

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <ViewTracker listingId={listing.id} />
      <header className="bg-[#184f43] text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/home" className="text-2xl font-bold italic tracking-tight">
            <span className="text-emerald-200">Uni</span>Nest
          </Link>
          <Link href="/home" className="text-sm font-semibold text-emerald-100 hover:text-white">
            ← Back to results
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[1fr_360px] sm:px-6 lg:px-8">
        <section className="space-y-5">
          <div className="grid grid-cols-1 gap-2 rounded-xl border border-gray-200 bg-white p-2 sm:grid-cols-[2fr_1fr]">
            <PhotosComponentNormal
              listingTitle={listing.title}
              photo={listing.photos[0]}
              photos={listing.photos}
              initialIndex={0}
              heightClass="h-72"
            />

            <div className="grid grid-rows-2 gap-2">
              {sidePhotos.map((photo, index) => (
                <PhotosComponentNormal 
                  key={photo.id} 
                  listingTitle={listing.title} 
                  photo={photo} 
                  photos={listing.photos}
                  initialIndex={index + 1}
                  moreCount={index === 0 && listing.photos.length > 3 ? listing.photos.length - 3 : 0}
                />
              ))}
              
              {listing.photos.length > 3 && (
                <PhotosComponent photoCount={listing.photos.length} photos={listing.photos} />
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h1 className="text-3xl font-bold text-gray-900">{listing.title}</h1>
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" /> {listing.address}
            </p>

            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-[#184f43]">KES {Number(listing.price).toLocaleString()}</span>
              <span className="text-sm text-gray-500">/ month</span>
              {listing.deposit && (
                <span className="ml-2 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600">
                  Deposit: KES {Number(listing.deposit).toLocaleString()}
                </span>
              )}
            </div>

            <p className="mt-2 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {typeLabel}
            </p>

            <h2 className="mt-6 text-sm font-bold uppercase tracking-wide text-gray-600">Distance from UoN campuses</h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {campusOrder.map((campus) => {
                const item = distances.find((d) => d.campus === campus)
                const isNearest = nearest?.campus === campus
                return (
                  <div
                    key={campus}
                    className={`rounded-lg border p-3 ${
                      isNearest ? "border-[#184f43] bg-emerald-50" : "border-gray-200 bg-white"
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-500">{campus}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">
                      {item?.minutes !== null && item?.minutes !== undefined ? `${item.minutes} min` : "-"}
                    </p>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {amenities.map((amenity) => (
                <span key={amenity} className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700">
                  {amenity}
                </span>
              ))}
            </div>

            <p className="mt-6 text-sm leading-7 text-gray-700">{listing.description ?? "No description provided."}</p>

            {listingLat !== null && listingLng !== null ? (
              <div className="mt-6 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-600">Location map</h2>
                <div className="grid gap-3 lg:grid-cols-[1fr_220px] lg:items-start">
                  <ListingMap
                    listing={{
                      lat: Number(listingLat),
                      lng: Number(listingLng),
                      title: listing.title,
                    }}
                    accessToken={mapboxAccessToken}
                    nearestCampus={nearest?.campus === "Main Campus" ? "Main Campus" : nearest?.campus === "Chiromo" ? "Chiromo" : "Parklands"}
                    campusMinutes={{
                      mainWalkingMin: listing.mainWalkingMinutes ?? -1,
                      chiromoWalkingMin: listing.chiromoWalkingMinutes ?? -1,
                      parklandsWalkingMin: listing.parklandsWalkingMinutes ?? -1,
                    }}
                    nearestCampusMinutes={nearest?.minutes ?? -1}
                  />
                  <div className="rounded-xl border border-gray-200 bg-white p-4 text-sm">
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Legend</p>
                    <div className="mt-3 space-y-3">
                      <LegendItem color="#ef4444" label="This listing" />
                      <LegendItem color="#184f43" label="Main Campus" />
                      <LegendItem color="#fb8a3c" label="Chiromo" />
                      <LegendItem color="#7c3aed" label="Parklands" />
                    </div>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=${Number(listingLat)},${Number(listingLng)}&destination=${nearest?.campus === "Main Campus" ? "36.8146,-1.2771" : nearest?.campus === "Chiromo" ? "36.8048,-1.2727" : "36.8149,-1.2685"}&travelmode=walking`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-full bg-[#184f43] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Contact Landlord</h3>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#184f43] text-sm font-bold text-white">
                {initials || "LD"}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{landlordName}</p>
                <p className="text-xs text-gray-500">
                  {avgRating ? `${avgRating.toFixed(1)} · ${ratingCount} reviews` : "No reviews yet"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phone</p>
                <a href={listing.landlord.user.phone ? `tel:${listing.landlord.user.phone}` : "#"} className="mt-1 inline-flex items-center gap-2 text-[#184f43] font-semibold">
                  <Phone className="h-4 w-4" />
                  {listing.landlord.user.phone ?? "Not shared"}
                </a>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Email</p>
                <p className="mt-1 inline-flex items-center gap-2 text-[#184f43] font-semibold">
                  <Mail className="h-4 w-4" />
                  {listing.landlord.user.firstName ? `${listing.landlord.user.firstName}.${listing.landlord.user.lastName ?? ""}@contact.uninest` : "Request via phone"}
                </p>
              </div>

              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Landlord</p>
                <p className="mt-1 text-sm text-gray-800">{landlordName}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Safety</h3>
            <p className="mt-2 text-sm text-gray-700">
              If this listing looks suspicious or misleading, let us know.
            </p>
            <Link
              href={`/fraud-report?listingId=${listing.id}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#fb8a3c] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#f07a2f]"
            >
              Report this listing
            </Link>
          </div>
        </aside>
      </main>
    </div>
  )
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3.5 w-3.5 rounded-full border border-white shadow-sm" style={{ backgroundColor: color }} />
      <span className="text-gray-700">{label}</span>
    </div>
  )
}


