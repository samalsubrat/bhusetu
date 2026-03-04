"use client"

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"
import { ChevronRight, ChevronLeft, Loader2, MapPin, ShieldCheck, ArrowRight } from "lucide-react"
import { usePincode } from "@/hooks/use-location-data"
import { useRegistration, validateLocationStep, type ValidationErrors } from "@/context/RegistrationContext"
import RegistrationFeeSidebar from "@/components/dashboard/RegistrationFeeSidebar"

import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

// Dynamically import the map to avoid SSR issues with Leaflet
const GISMap = dynamic(() => import("@/components/dashboard/GISMap"), {
    ssr: false,
    loading: () => (
        <div className="w-full h-90 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
            <Loader2 className="size-6 animate-spin text-slate-400" />
        </div>
    ),
})

const Location = () => {
    const router = useRouter()
    const { data: regData, updateField, updateFields } = useRegistration()
    const [pincode, setPincode] = useState(regData.pincode)
    const [boundary, setBoundary] = useState<GeoJSON.FeatureCollection | null>(null)
    const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null)
    const [gpsLoading, setGpsLoading] = useState(false)
    const [gpsError, setGpsError] = useState<string | null>(null)

    const { data, loading, error } = usePincode(pincode)
    const [errors, setErrors] = useState<ValidationErrors>({})

    const handlePincodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\D/g, "").slice(0, 6)
        setPincode(value)
        updateField("pincode", value)
        // Clear gpsLocation to allow the map to automatically center on the new pin-code location
        setGpsLocation(null)
    }

    const handleGpsLocate = () => {
        if (!navigator.geolocation) {
            setGpsError("Geolocation is not supported by your browser.")
            return
        }
        setGpsLoading(true)
        setGpsError(null)
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                setGpsLocation({ lat: latitude, lng: longitude })

                // Reverse geocode to get pincode
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
                        { headers: { "User-Agent": "BhuSetu/1.0" } }
                    )
                    const geo = await res.json()
                    const postcode = geo?.address?.postcode
                    if (postcode && /^\d{6}$/.test(postcode)) {
                        setPincode(postcode)
                        updateField("pincode", postcode)
                    }
                } catch {
                    // Reverse geocoding failed silently — user can still type pincode
                }

                setGpsLoading(false)
            },
            (err) => {
                setGpsError(
                    err.code === 1
                        ? "Location access denied. Please allow location permission."
                        : "Unable to retrieve your location."
                )
                setGpsLoading(false)
            },
            { enableHighAccuracy: true, timeout: 10000 }
        )
    }

    // GPS takes priority over pincode-derived location
    const mapLat = gpsLocation?.lat ?? data?.lat ?? 20.2961
    const mapLng = gpsLocation?.lng ?? data?.lng ?? 85.8245
    const mapZoom = gpsLocation ? 18 : data?.lat ? 15 : 5

    const handleMarkerDrag = async (lat: number, lng: number) => {
        setGpsLocation({ lat, lng })
        // Reverse geocode to update pincode
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
                { headers: { "User-Agent": "BhuSetu/1.0" } }
            )
            const geo = await res.json()
            const postcode = geo?.address?.postcode
            if (postcode && /^\d{6}$/.test(postcode)) {
                setPincode(postcode)
            }
        } catch {
            // Reverse geocoding failed silently
        }
    }

    const handleNextStep = () => {
        const validationErrors = validateLocationStep(regData)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) return
        router.push('/dashboard/registration/documents')
    }

    const handlePreviousStep = () => {
        router.push('/dashboard/registration/details')
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-8">

                {/* Map  */}
                <div className='px-6 py-4 bg-white border border-gray-300 rounded-lg shadow-sm'>
                    <h2 className='text-black text-xs md:text-sm font-semibold pb-4 w-full flex items-center justify-between'>GIS BOUNDARY MAPPING
                        <button
                            onClick={handleGpsLocate}
                            disabled={gpsLoading}
                            title="Use GPS to pinpoint your location"
                            className='p-2 bg-gray-200 rounded-md text-gray-600 hover:text-black hover:bg-gray-300 transition-all duration-300 cursor-pointer disabled:opacity-50'
                        >
                            {gpsLoading ? <Loader2 className='size-4 animate-spin' /> : <MapPin className='size-4' />}
                        </button>
                    </h2>
                    <div className='h-px bg-slate-300 -mx-6' />

                    <div className='mt-4 rounded-md'>
                        <GISMap
                            lat={mapLat}
                            lng={mapLng}
                            zoom={mapZoom}
                            onBoundaryChange={(geoJson) => setBoundary(geoJson)}
                            onMarkerDrag={handleMarkerDrag}
                        />
                        {boundary && boundary.features.length > 0 && (
                            <p className="text-xs text-green-600 mt-2 font-medium">
                                ✓ {boundary.features.length} boundary region{boundary.features.length > 1 ? "s" : ""} drawn
                            </p>
                        )}
                        <div className='flex items-center justify-between'>
                            <p className="text-xs text-slate-400 mt-2">
                                Use the drawing tools on the left to mark your property boundary. Switch between Street and Satellite views.
                            </p>
                            {gpsError && <p className="text-xs text-destructive mt-2">{gpsError}</p>}
                            {gpsLocation && <p className="text-xs text-green-600 mt-2 font-medium">📍 GPS: {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}</p>}
                        </div>
                    </div>
                </div>

                {/* Location Details */}
                <div className='p-6 bg-white border border-gray-300 rounded-lg shadow-sm'>
                    <h2 className='text-black text-xs md:text-sm font-semibold pb-4 w-full'>LOCATION INFORMATION</h2>
                    <div className='h-px bg-slate-300 -mx-6' />
                    <h2 className='text-gray-500 text-sm my-4'>Enter your PIN code to auto-fill location details.</h2>
                    <div className='grid grid-cols-2 gap-4'>
                        <Field>
                            <FieldLabel htmlFor="pincode" className='text-xs -mb-1 text-gray-500'>
                                PIN CODE<span className="text-destructive">*</span>
                            </FieldLabel>
                            <div className="relative">
                                <Input
                                    id="pincode"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="Enter 6-digit PIN code"
                                    value={pincode}
                                    onChange={handlePincodeChange}
                                    maxLength={6}
                                />
                                {loading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <Loader2 className="size-4 animate-spin text-primary" />
                                    </div>
                                )}
                            </div>
                            {error && <p className="text-xs text-destructive mt-1">{error}</p>}
                            {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="state" className='text-xs -mb-1 text-gray-500'>
                                STATE<span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="state"
                                type="text"
                                placeholder="Auto-filled from PIN code"
                                value={data?.state ?? ""}
                                readOnly
                                className="bg-slate-50"
                                onChange={() => {
                                    if (data?.state) updateField("state", data.state)
                                }}
                                ref={(el) => {
                                    if (el && data?.state && regData.state !== data.state) {
                                        updateField("state", data.state)
                                    }
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="district" className='text-xs -mb-1 text-gray-500'>
                                DISTRICT<span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="district"
                                type="text"
                                placeholder="Auto-filled from PIN code"
                                value={data?.district ?? ""}
                                readOnly
                                className="bg-slate-50"
                                ref={(el) => {
                                    if (el && data?.district && regData.district !== data.district) {
                                        updateField("district", data.district)
                                    }
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="postoffice" className='text-xs -mb-1 text-gray-500'>
                                POST OFFICE<span className="text-destructive">*</span>
                            </FieldLabel>
                            <Combobox
                                key={pincode}
                                items={data?.postOffices ?? []}
                                disabled={!data}
                                value={regData.postOffice}
                                onValueChange={(val) => { updateField("postOffice", val ?? ""); setErrors(prev => ({ ...prev, postOffice: "" })) }}
                            >
                                <ComboboxInput placeholder={data ? "Select a Post Office" : "Enter PIN code first"} className={errors.postOffice ? "border-red-500" : ""} />
                                <ComboboxContent>
                                    <ComboboxEmpty>No post offices found.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item) => (
                                            <ComboboxItem key={item} value={item}>
                                                {item}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                            {errors.postOffice && <p className="text-xs text-red-500 mt-1">{errors.postOffice}</p>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tehsil" className='text-xs -mb-1 text-gray-500'>
                                TEHSIL / VILLAGE<span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="tehsil"
                                type="text"
                                placeholder="Enter Tehsil / Village name"
                                value={regData.tehsil}
                                onChange={(e) => { updateField("tehsil", e.target.value); setErrors(prev => ({ ...prev, tehsil: "" })) }}
                                className={errors.tehsil ? "border-red-500" : ""}
                            />
                            {errors.tehsil && <p className="text-xs text-red-500 mt-1">{errors.tehsil}</p>}
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="plotnumber" className='text-xs -mb-1 text-gray-500'>
                                PLOT NUMBER<span className="text-destructive">*</span>
                            </FieldLabel>
                            <Input
                                id="plotnumber"
                                type="text"
                                placeholder="Enter Plot Number of your property"
                                value={regData.plotNumber}
                                onChange={(e) => { updateField("plotNumber", e.target.value); setErrors(prev => ({ ...prev, plotNumber: "" })) }}
                                className={errors.plotNumber ? "border-red-500" : ""}
                            />
                            {errors.plotNumber && <p className="text-xs text-red-500 mt-1">{errors.plotNumber}</p>}
                        </Field>
                    </div>
                </div>
            </div>

            {/* Right: Info Panel */}
            <div className="lg:col-span-1 space-y-6">

                {/* Blockchain Security */}
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-center gap-2 mb-4 text-primary">
                        <ShieldCheck className="size-5" />
                        <h3 className="font-bold">Blockchain Security</h3>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Data submitted here will be hashed and stored on the BhuSetu Private Blockchain.
                        Once confirmed, this record becomes{" "}
                        <span className="font-bold text-primary">immutable</span> and legally binding.
                    </p>
                    <div className="mt-6 p-3 bg-white rounded-lg flex items-center gap-3 shadow-sm">
                        <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Network: Node-04 Active
                        </span>
                    </div>
                </div>

                {/* location verification  */}
                <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                    <div className="flex items-start gap-4">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                            <ChevronRight className="size-5 text-blue-600" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h3 className="text-sm font-bold text-slate-900">Location Verification</h3>
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Provide accurate location details. This information will be verified against official records and satellite mapping.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dynamic Registration Fee */}
                <RegistrationFeeSidebar />

                {/* Need Assistance */}
                <div className="bg-slate-900 text-white rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                    <h3 className="font-bold relative z-10">Need Assistance?</h3>
                    <p className="text-xs text-slate-400 mt-2 relative z-10">
                        Contact the district registrar office for documentation queries.
                    </p>
                    <button className="mt-4 flex items-center gap-2 text-sm font-bold text-primary relative z-10 group">
                        Live Support
                        <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button variant="ghost" className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-600">
                        Save Draft
                    </Button>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={handlePreviousStep}
                            className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-500 gap-2"
                        >
                            <ChevronLeft className="size-4" />
                            Previous
                        </Button>
                        <Button
                            onClick={handleNextStep}
                            className="hover:cursor-pointer w-full sm:w-auto px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/25 gap-2"
                        >
                            Next Step
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Location