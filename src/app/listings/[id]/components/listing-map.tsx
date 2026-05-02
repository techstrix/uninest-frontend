"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"

type MapPoint = {
  lng: number
  lat: number
  label: string
  color: string
}

type ListingMapProps = {
  listing: {
    lng: number
    lat: number
    title: string
  }
  accessToken: string
  nearestCampus: "Main Campus" | "Chiromo" | "Parklands"
  campusMinutes:{
  [key: string]: number | null
  }
  nearestCampusMinutes: number


}

const campusPoints: MapPoint[] = [
  { lng: 36.8149, lat: -1.2685, label: "Parklands", color: "#7c3aed" },
  { lng: 36.8048, lat: -1.2727, label: "Chiromo", color: "#fb8a3c" },
  { lng: 36.8146, lat: -1.2771, label: "Main Campus", color: "#184f43" },
]

export default function ListingMap({ listing, accessToken, nearestCampus }: ListingMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)

  const nearestCampusPoint = useMemo(() => campusPoints.find((point) => point.label === nearestCampus) ?? campusPoints[0], [nearestCampus])

  useEffect(() => {
    if (!accessToken) {
      return
    }

    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    mapboxgl.accessToken = accessToken

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [listing.lng, listing.lat],
      zoom: 13,
    })

    map.addControl(new mapboxgl.NavigationControl(), "top-right")

    map.on("load", () => {
      const allPoints = [
        { lng: listing.lng, lat: listing.lat, label: listing.title, color: "#ef4444" },
        ...campusPoints,
      ]

      const bounds = new mapboxgl.LngLatBounds()

      allPoints.forEach((point) => {
        const el = document.createElement("div")
        el.className = "listing-map-marker"
        el.style.backgroundColor = point.color
        el.style.width = "14px"
        el.style.height = "14px"
        el.style.borderRadius = "9999px"
        el.style.border = "2px solid white"
        el.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.35)"
        el.style.cursor = "pointer"

        new mapboxgl.Marker(el)
          .setLngLat([point.lng, point.lat])
          .setPopup(new mapboxgl.Popup({ offset: 16 }).setText(point.label))
          .addTo(map)

        bounds.extend([point.lng, point.lat])
      })

      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 0 })
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [accessToken, listing.lat, listing.lng, listing.title])

  return (
    <div className="space-y-3">
      <div ref={mapContainerRef} className="h-72 w-full rounded-xl border border-gray-200" />
    </div>
  )
}
