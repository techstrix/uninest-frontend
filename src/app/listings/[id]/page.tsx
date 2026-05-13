import Link from "next/link"
import { UniNestWordmark } from "@/components/brand/uninest-wordmark"
import { notFound } from "next/navigation"
import { MapPin } from "lucide-react"
import { prisma } from "@/lib/prisma"
import PhotosComponent from "./components/photosComponent"

import PhotosComponentNormal from "./components/photosComponentNormal"
import ViewTracker from "./components/view-tracker"
import ListingMap from "./components/listing-map"
import ContactCard from "./components/contact-card"
import ReviewsSection from "./components/reviews-section"


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
        orderBy: {
          createdAt: "desc",
        },
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
      landlord: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  profilePhoto: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
    },
  })

  if (!listing) {
    notFound()
  }

  if (listing.status === "inactive") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-500">Listing Suspended</p>
          <h1 className="mt-3 text-2xl font-bold text-gray-900">This listing is currently suspended</h1>
          <p className="mt-3 text-sm leading-6 text-gray-600">
            The listing is unavailable right now. Please return home to browse other active listings.
          </p>
          <Link
            href="/home"
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-[#184f43] px-5 py-3 text-sm font-semibold text-white hover:bg-[#153f36]"
          >
            Go home
          </Link>
        </div>
      </div>
    )
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

  const landlordName = `${listing.landlord.user.firstName ?? ""} ${listing.landlord.user.lastName ?? ""}`.trim() || "Landlord"
  const landlordEmail = listing.landlord.user.email ?? "Not shared"
  const landlordPhoto = listing.landlord.user.profilePhoto ?? null

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
    
  

  
  const sidePhotos = listing.photos.slice(1, 3)
  const listingLat = listing.latitude ?? null
  const listingLng = listing.longitude ?? null
  const ratingCount = listing.reviews.length
  const averageRating = ratingCount > 0 ? listing.reviews.reduce((sum, review) => sum + review.rating, 0) / ratingCount : null

  return (
    <div className="min-h-screen bg-[#f3f4f6]">
      <ViewTracker listingId={listing.id} />
      <header className="bg-[#184f43] text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/home" aria-label="UniNest home">
            <UniNestWordmark className="text-2xl" />
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
                      href={`https://www.google.com/maps/search/?api=1&query=${Number(listingLat)},${Number(listingLng)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex rounded-full bg-[#184f43] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Open in Maps
                    </a>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <ReviewsSection
            listingId={listing.id}
            reviews={listing.reviews.map((review) => ({
              id: review.id,
              rating: review.rating,
              comment: review.comment,
              createdAt: review.createdAt.toISOString(),
              student: {
                firstName: review.student.firstName,
                lastName: review.student.lastName,
                profilePhoto: review.student.profilePhoto,
              },
            }))}
            averageRating={averageRating}
            ratingCount={ratingCount}
          />
        </section>

        <aside className="space-y-4">
          <ContactCard listingId={listing.id} landlordName={landlordName} landlordPhoto={landlordPhoto} phone={listing.landlord.user.phone ?? null} email={landlordEmail} />
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-600">Safety</h3>
            <p className="mt-2 text-sm text-gray-700">
              If this listing looks suspicious or misleading, let us know.
            </p>
            <Link
              href={`/fraud-report?listingId=${listing.id}`}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-[#dc2626] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#b91c1c]"
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


