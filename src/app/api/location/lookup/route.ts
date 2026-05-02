import { NextResponse } from "next/server"

const campusCoordinates = {
  mainWalkingMin: { coord: [36.8149, -1.2685] as const },
  chiromoWalkingMin: { coord: [36.8048, -1.2727] as const },
  parklandsWalkingMin: { coord: [36.8219, -1.2771] as const },
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 })
    }

    const token = process.env.MAPBOX_ACCESS_TOKEN
    if (!token) {
      return NextResponse.json({ error: "MAPBOX_ACCESS_TOKEN is not configured." }, { status: 500 })
    }

    const locationLabel = await getLocationLabel(longitude, latitude, token)
    const campusTimes = await getCampusTimes(longitude, latitude, token)

    return NextResponse.json({ locationLabel, campusTimes })
  } catch (error) {
    console.error("Location lookup failed", error)
    return NextResponse.json({ error: "Failed to resolve location." }, { status: 500 })
  }
}

async function getLocationLabel(
  longitude: number,
  latitude: number,
  token: string,
) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=address,place,locality,neighborhood&limit=1&access_token=${token}`
  const response = await fetch(url)

  if (!response.ok) {
    console.error("Mapbox geocoding failed", {
      status: response.status,
      statusText: response.statusText,
      url,
    })

    throw new Error("Mapbox geocoding failed.")
  }

  const data = await response.json()
  console.log("Mapbox geocoding response", data)
  return data?.features?.[0]?.place_name ?? `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
}

async function getCampusTimes(longitude: number, latitude: number, token: string) {
  const house = [longitude, latitude] as const
  const campusList = Object.values(campusCoordinates).map((campus) => campus.coord)
  const points = [house, ...campusList]

  const matrixUrl = `https://api.mapbox.com/directions-matrix/v1/mapbox/walking/${points
    .map((point) => `${point[0]},${point[1]}`)
    .join(";")}?sources=0&destinations=1;2;3&annotations=duration,distance&access_token=${token}`

  const response = await fetch(matrixUrl)

  if (!response.ok) {
    const errorBody = await response.text()
    console.error("Mapbox matrix failed", {
      status: response.status,
      statusText: response.statusText,
      url: matrixUrl,
      body: errorBody,
    })

    throw new Error("Mapbox matrix failed.")
  }

  const data = await response.json()
  console.log("Mapbox matrix response", data)

  const durations = data?.durations?.[0]
  if (!Array.isArray(durations) || durations.length < 3) {
    throw new Error("Mapbox matrix returned no usable duration.")
  }

  return {
    mainWalkingMin: Math.round(Number(durations[0]) / 60),
    chiromoWalkingMin: Math.round(Number(durations[1]) / 60),
    parklandsWalkingMin: Math.round(Number(durations[2]) / 60),
  }
}
