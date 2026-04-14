"use client"
import { useEffect, useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { Search, MapPin, Bed, Bath, Droplets, Zap, Wifi, Shield, Car, Star, LogOut, Trash2, X } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import Image from "next/image"


const campuses = ["All Campuses", "Main Campus", "Chiromo Campus", "Parklands Campus"]
const filters = ["All types", "Bedsitter", "1 Bedroom", "2 Bedroom", { label: "KES 4K - 15K"}]

type Listing = {
  id: string
  title: string
  address: string
  bedroomType: string | null
  amenities: string[]
  price: number
  mainWalkingMinutes: number | null
  chiromoWalkingMinutes: number | null
  parklandsWalkingMinutes: number | null
  photoUrl: string | null
  rating: number | null
  reviews: number
}

const getFilterType = (filter: string) => {
  if (filter === "Bedsitter") return "BEDSITTER"
  if (filter === "1 Bedroom") return "ONE_BEDROOM"
  if (filter === "2 Bedroom") return "TWO_BEDROOM"
  return null
}

const getWalkingMinutes = (listing: Listing, campus: string) => {
  if (campus === "Main Campus") return listing.mainWalkingMinutes
  if (campus === "Chiromo Campus") return listing.chiromoWalkingMinutes
  return listing.parklandsWalkingMinutes
}

const getNearestCampusDistance = (listing: Listing) => {
  const distances = [
    { campus: "Main Campus", minutes: listing.mainWalkingMinutes },
    { campus: "Chiromo Campus", minutes: listing.chiromoWalkingMinutes },
    { campus: "Parklands Campus", minutes: listing.parklandsWalkingMinutes },
  ].filter((item): item is { campus: string; minutes: number } => item.minutes !== null && item.minutes >= 0)

  if (distances.length === 0) return null

  return distances.reduce((shortest, current) => {
    if (current.minutes < shortest.minutes) return current
    return shortest
  })
}

const getDisplayBedroomType = (bedroomType: string | null) => {
  if (bedroomType === "BEDSITTER" || bedroomType === "Bedsitter") return "BEDSITTER"
  if (bedroomType === "ONE_BEDROOM") return "1 BEDROOM"
  if (bedroomType === "TWO_BEDROOM") return "2 BEDROOM"
  if (bedroomType === "THREE_BEDROOM") return "3 BEDROOM"
  return "ROOM"
}

const getBeds = (bedroomType: string | null) => {
  if (bedroomType === "BEDSITTER") return 1
  if (bedroomType === "ONE_BEDROOM") return 1
  if (bedroomType === "TWO_BEDROOM") return 2
  if (bedroomType === "THREE_BEDROOM") return 3
  return 1
}

const filterListings = (listings: Listing[],search:string, campus: string, typeFilter: string, priceRange: boolean) => {
  return listings.filter((listing) => {
    const nearestCampus = getNearestCampusDistance(listing)
    const matchesCampus = campus === "All Campuses" ? true : nearestCampus?.campus === campus
    let matchesType = true
    let matchesPrice = true
    let matchesSearch = true

    if (typeFilter !== "All types") {
      const filterType = getFilterType(typeFilter)
      matchesType = listing.bedroomType === filterType
    }
    if(search){
      matchesSearch = listing.title.toLowerCase().includes(search.toLowerCase()) || listing.address.toLowerCase().includes(search.toLowerCase())
    }

    if (priceRange) {
      matchesPrice = listing.price >= 4000 && listing.price <= 15000
    }

    return matchesCampus && matchesType && matchesPrice && matchesSearch  
  })
}


export default function Home() {
  const { user,isSignedIn,isLoaded } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [activeCampus, setActiveCampus] = useState("All Campuses")
  const [activeFilter, setActiveFilter] = useState("All types")
  const [priceRangeActive, setPriceRangeActive] = useState(false)
  const [listings, setListings] = useState<Listing[]>([])
  const [filteredListings, setFilteredListings] = useState<Listing[]>([])
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const initials = user?.firstName?.[0] || "U"
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [confirmDelete,setConfirmDelete] = useState(false)
  const [loadingListings, setLoadingListings] = useState(true)
  const [searchInputState,setSearchInputState] = useState("")

  


  const searchParams = useSearchParams()


  useEffect(() => {

  if(!isLoaded) return;
   console.log("Sign in statuss",isSignedIn)

  if (isLoaded && !isSignedIn) {
    
    router.push("/sign-in");
  }
  
  },[isSignedIn,router,isLoaded])

  useEffect(() => {

    const fetchListings = async () => {
      try {
        setLoadingListings(true)
        const response = await fetch("/api/listings")

        if (!response.ok) {
          throw new Error("Failed to load listings")
        }

        const data = await response.json()
        setListings(data.listings)

      } catch (error) {
        console.error("Failed to load listings", error)
        toast.error("Failed to load listings")
      } finally {
        setLoadingListings(false)
      }
    }

    fetchListings()
  }, [])

  useEffect(() => {
    const campusFromParams = searchParams.get("campus") || "All Campuses"
    const filterFromParams = searchParams.get("filter") || "All types"
    const priceFromParams = searchParams.get("price") === "true"
    const searchFromParams = searchParams.get("search") || ""
    
    setActiveCampus(campusFromParams)
    setActiveFilter(filterFromParams)
    setPriceRangeActive(priceFromParams)
    
    const filtered = filterListings(listings, searchFromParams, campusFromParams, filterFromParams, priceFromParams)
    setFilteredListings(filtered)
  }, [searchParams, listings])


  const handleFilterClick = (filter: string) => {
    // If clicking price range, toggle it
    if (filter === "KES 4K - 15K") {
      const newPriceState = !priceRangeActive
      router.push(`/home?campus=${activeCampus}&filter=${activeFilter}&price=${newPriceState}`)
    } else {
      // Reset price range when selecting type filter, but allow combining if already active
      const newPrice = priceRangeActive ? priceRangeActive : false
      router.push(`/home?campus=${activeCampus}&filter=${filter}&price=${newPrice}`)
    }
  }
  const handleLogout  = async () => {
    await signOut()
    router.push("/sign-in")
  }
  const handleShowDeleteWarning = () => {
    setShowDeleteConfirm(true)
  }

  const handleConfirmDelete =async () => {
    if (!user?.id || confirmDelete) return

    try {
      setConfirmDelete(true)
      const response = await fetch("/api/delete-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if(!response.ok){
        toast.error("Failed to delete account. Please try again.")
        return;
      }

      setShowDeleteConfirm(false)
      toast.success("Account deleted successfully.")
      router.push("/sign-up")
    } catch (error) {
      console.error("Failed to delete account", error)
      toast.error("Failed to delete account. Please try again.")
    } finally {
      setConfirmDelete(false)
    }
  }

  const handleCampusClick = (campus: string) => {
    router.push(`/home?campus=${campus}&filter=${activeFilter}&price=${priceRangeActive}`)
  }

  const handleSearchButtonClicked = () => { 
    router.push(`/home?campus=${activeCampus}&filter=${activeFilter}&price=${priceRangeActive}&search=${searchInputState}`)

  
  
  }



 console.log("Listings:", listings)
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#204038] ">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-xl font-bold ">
              <Link href="/home" >
                <span className="text-emerald-700">Uni</span><span className="text-white">Nest</span>
              </Link>
            </h1>
            <nav className="flex items-center gap-6">
              {/* <a href="#" className="text-sm font-medium text-gray-900">Search</a> */}
              {/* <a href="#" className="text-sm font-medium text-gray-500 hover:text-gray-900 flex items-center gap-1">
                Messages
                <span className="bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">2</span>
              </a> */}
              <div className="relative">
                <button 
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-[#347868] text-white text-sm font-semibold flex items-center justify-center hover:bg-[#2a6354] transition"
                >
                  {initials}
                </button>
                
                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-gray-500">{user?.emailAddresses[0]?.emailAddress}</p>
                      </div>
                      {/* <button className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition">
                        <User className="w-4 h-4 text-gray-400" />
                        Profile Settings
                      </button> */}
                      <button 
                        onClick={() => {
                          handleLogout()
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3 transition"
                      >
                        <LogOut className="w-4 h-4 text-gray-400" />
                        Log out
                      </button>
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button 
                        onClick={() => {
                          handleShowDeleteWarning()
                          setShowProfileMenu(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete Account
                      </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-[#1a3c34] text-white py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold mb-1">Find your next home near campus</h2>
          <p className="text-emerald-200 text-sm mb-6">Listings ranked by walking distance from your campus — not by who paid most to be featured.</p>

          {/* Campus Tabs */}
          <div className="flex gap-2 mb-5">
            {campuses.map((campus) => (
              <button
                key={campus}
                onClick={() => handleCampusClick(campus)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeCampus === campus
                    ? "bg-white text-[#1a3c34]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {campus}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Bedsitter near Main Campus"
                 className="w-full h-10 pl-10 pr-4 rounded-md text-sm text-black bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3c34]"
                  onChange = {(e) => setSearchInputState(e.target.value)}
             />
            </div>
            <button onClick={handleSearchButtonClicked} className="px-6 h-10 bg-[#e07a3a] hover:bg-[#c96a2f] text-white font-semibold text-sm rounded-lg transition">
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {filters.map((filter) => {
              const label = typeof filter === "string" ? filter : filter.label
              const isActive = label === "KES 4K - 15K" ? priceRangeActive : activeFilter === label
              return (
                <button
                  key={label}
                  onClick={() => handleFilterClick(label)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1 ${
                    isActive
                      ? "bg-[#1a3c34] text-white"
                      : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <span className="text-xs text-gray-500">{filteredListings.length} listings found</span>
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {!loadingListings && filteredListings.length === 0 && (
            <p className="text-sm text-gray-500">No listings found for this campus and filter.</p>
          )}
          {filteredListings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition">
              {/* Image Placeholder */}
              <div className="relative h-36 bg-[#2a5c4a] flex items-center justify-center overflow-hidden">
                {listing.photoUrl ? (
                  <Image
                    src={listing.photoUrl}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-white/60 text-xs font-semibold tracking-wider">{getDisplayBedroomType(listing.bedroomType)}</span>
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500 text-white">
                  {getDisplayBedroomType(listing.bedroomType)}
                </span>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-lg font-bold text-gray-900">KES {listing.price.toLocaleString()}</span>
                  <span className="text-xs text-gray-500">/ month</span>
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{listing.title}</h3>
                <p className="text-xs text-gray-500 mb-3">{listing.address}</p>

                {/* Amenities */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                  <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{getBeds(listing.bedroomType)} bed</span>
                  <span className="flex items-center gap-1"><Bath className="w-3 h-3" />1 bath</span>
                  {listing.amenities.map((a: string) => (
                    <span key={a} className="flex items-center gap-1">
                      {a.toLowerCase().includes("water") && <Droplets className="w-3 h-3" />}
                      {(a.toLowerCase().includes("token") || a.toLowerCase().includes("power")) && <Zap className="w-3 h-3" />}
                      {a.toLowerCase().includes("wifi") && <Wifi className="w-3 h-3" />}
                      {(a.toLowerCase().includes("cctv") || a.toLowerCase().includes("guard") || a.toLowerCase().includes("security")) && <Shield className="w-3 h-3" />}
                      {(a.toLowerCase().includes("parking") || a.toLowerCase().includes("car")) && <Car className="w-3 h-3" />}
                      {(a.toLowerCase().includes("ensuite") || a.toLowerCase().includes("bath")) && <Bath className="w-3 h-3" />}
                      {a}
                    </span>
                  ))}
                </div>

                {/* Distance */}
                <div className="flex items-center gap-1 text-xs text-[#1a3c34] font-medium mb-3">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {getNearestCampusDistance(listing)?.minutes ?? "-"} min · {getNearestCampusDistance(listing)?.campus ?? "Unknown"}
                  </span>
                </div>

                {/* Rating & Action */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  {listing.rating ? (
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= Math.round(listing.rating!) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-gray-900">{listing.rating}</span>
                      <span className="text-xs text-gray-500">({listing.reviews})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">No reviews yet</span>
                  )}
                  <Link href={`/listings/${listing.id}`} className="px-4 py-1.5 bg-[#1a3c34] hover:bg-[#15332c] text-white text-xs font-semibold rounded-lg transition">
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50" 
            onClick={() => setShowDeleteConfirm(false)}
          />
          
          {/* Modal Content */}
          <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <button 
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Account?
              </h3>
              
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={confirmDelete}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition"
                >
                  {confirmDelete ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}