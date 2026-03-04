"use client"

import { useState, useEffect } from "react"
import { fetchByPincode, type PostOffice } from "@/lib/api/location"

interface PincodeData {
    state: string
    district: string
    postOffices: string[]
    block: string
    lat: number | null
    lng: number | null
}

export function usePincode(pincode: string) {
    const [data, setData] = useState<PincodeData | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        // Only fetch for valid 6-digit pincodes
        if (!pincode || pincode.length !== 6 || !/^\d{6}$/.test(pincode)) {
            setData(null)
            setError(null)
            return
        }

        setLoading(true)
        setError(null)

        fetchByPincode(pincode)
            .then(async (res) => {
                if (res.Status === "Success" && res.PostOffice && res.PostOffice.length > 0) {
                    const first = res.PostOffice[0]
                    const postOfficeNames = res.PostOffice.map((po: PostOffice) => po.Name)

                    // Geocode using Nominatim (free, no key)
                    let lat: number | null = null
                    let lng: number | null = null
                    try {
                        const queries = [
                            `${first.Name}, ${first.District}, ${first.State}, India, ${pincode}`,
                            `${pincode}, India`, // Fallback 1: Just the pincode
                            `${first.District}, ${first.State}, India` // Fallback 2: District and state
                        ]

                        for (const geoQuery of queries) {
                            const geoRes = await fetch(
                                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(geoQuery)}&format=json&limit=1&countrycodes=in`,
                                { headers: { "User-Agent": "BhuSetu/1.0" } }
                            )
                            const geoData = await geoRes.json()
                            if (geoData && geoData.length > 0) {
                                lat = parseFloat(geoData[0].lat)
                                lng = parseFloat(geoData[0].lon)
                                break // Stop searching if we found a match
                            }
                        }
                    } catch {
                        // Geocoding failed silently — map won't move
                    }

                    setData({
                        state: first.State,
                        district: first.District,
                        postOffices: postOfficeNames,
                        block: first.Block,
                        lat,
                        lng,
                    })
                    setError(null)
                } else {
                    setData(null)
                    setError("No data found for this PIN code")
                }
            })
            .catch(() => {
                setData(null)
                setError("Failed to fetch PIN code data")
            })
            .finally(() => setLoading(false))
    }, [pincode])

    return { data, loading, error }
}
