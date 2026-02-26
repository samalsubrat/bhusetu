"use client"

import { useEffect, useRef, useCallback } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import "leaflet-draw"
import "leaflet-draw/dist/leaflet.draw.css"

// Fix default marker icons for Leaflet in bundled environments
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

interface GISMapProps {
    lat?: number
    lng?: number
    zoom?: number
    onBoundaryChange?: (geoJson: GeoJSON.FeatureCollection) => void
    onMarkerDrag?: (lat: number, lng: number) => void
    className?: string
}

export default function GISMap({
    lat = 20.2961,
    lng = 85.8245,
    zoom = 13,
    onBoundaryChange,
    onMarkerDrag,
    className = "",
}: GISMapProps) {
    const mapRef = useRef<L.Map | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const markerRef = useRef<L.Marker | null>(null)
    const drawnItemsRef = useRef<L.FeatureGroup | null>(null)

    // Initialize map
    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
            center: [lat, lng],
            zoom,
            zoomControl: true,
        })

        // Satellite + labels hybrid layer (Esri)
        const satellite = L.tileLayer(
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            {
                attribution: "Tiles &copy; Esri",
                maxZoom: 19,
            }
        )

        // Street layer (OSM)
        const streets = L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution: "&copy; OpenStreetMap contributors",
                maxZoom: 19,
            }
        )

        streets.addTo(map)

        L.control.layers(
            { "Street": streets, "Satellite": satellite },
            {},
            { position: "topright" }
        ).addTo(map)

        // Drawn items layer for GIS boundaries
        const drawnItems = new L.FeatureGroup()
        map.addLayer(drawnItems)
        drawnItemsRef.current = drawnItems

        // Drawing controls
        const drawControl = new L.Control.Draw({
            position: "topleft",
            draw: {
                polygon: {
                    allowIntersection: false,
                    shapeOptions: {
                        color: "#3b82f6",
                        weight: 3,
                        fillOpacity: 0.15,
                    },
                },
                polyline: false,
                rectangle: {
                    shapeOptions: {
                        color: "#3b82f6",
                        weight: 3,
                        fillOpacity: 0.15,
                    },
                },
                circle: false,
                circlemarker: false,
                marker: false,
            },
            edit: {
                featureGroup: drawnItems,
                remove: true,
            },
        })
        map.addControl(drawControl)

        // Handle draw events
        map.on(L.Draw.Event.CREATED, (e: unknown) => {
            const event = e as L.DrawEvents.Created
            drawnItems.addLayer(event.layer)
            if (onBoundaryChange) {
                onBoundaryChange(drawnItems.toGeoJSON() as GeoJSON.FeatureCollection)
            }
        })

        map.on(L.Draw.Event.EDITED, () => {
            if (onBoundaryChange) {
                onBoundaryChange(drawnItems.toGeoJSON() as GeoJSON.FeatureCollection)
            }
        })

        map.on(L.Draw.Event.DELETED, () => {
            if (onBoundaryChange) {
                onBoundaryChange(drawnItems.toGeoJSON() as GeoJSON.FeatureCollection)
            }
        })

        // Location marker (draggable)
        const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
        marker.on("dragend", () => {
            const pos = marker.getLatLng()
            if (onMarkerDrag) {
                onMarkerDrag(pos.lat, pos.lng)
            }
        })
        markerRef.current = marker

        mapRef.current = map

        return () => {
            map.remove()
            mapRef.current = null
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Update map center and marker when lat/lng change
    const updateLocation = useCallback((newLat: number, newLng: number) => {
        if (!mapRef.current) return
        mapRef.current.flyTo([newLat, newLng], 15, { duration: 1.5 })

        if (markerRef.current) {
            markerRef.current.setLatLng([newLat, newLng])
        } else {
            const marker = L.marker([newLat, newLng], { draggable: true }).addTo(mapRef.current)
            marker.on("dragend", () => {
                const pos = marker.getLatLng()
                if (onMarkerDrag) {
                    onMarkerDrag(pos.lat, pos.lng)
                }
            })
            markerRef.current = marker
        }
    }, [])

    useEffect(() => {
        if (lat && lng && mapRef.current) {
            updateLocation(lat, lng)
        }
    }, [lat, lng, updateLocation])

    return (
        <div
            ref={containerRef}
            className={`w-full rounded-lg overflow-hidden border border-slate-200 ${className}`}
            style={{ height: 350 }}
        />
    )
}
