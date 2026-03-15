"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, AlertCircle, FileText, CheckCircle2, Search, Filter, Download, Landmark, MapPin, Database } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Owner {
    id: string
    name: string
    email: string
    phone: string | null
}

interface Property {
    id: string
    bhuSetuId: string
    title: string
    type: string
    status: string
    areaSqFt: number
    state: string
    district: string
    taluka: string | null
    village: string | null
    surveyNumber: string | null
    owner: Owner
    createdAt: string
}

function formatArea(area: number): string {
    return area.toLocaleString("en-IN")
}

export default function AllLandRecordsPage() {
    const { user: currentUser } = useAuth()
    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchProperties()
    }, [])

    const fetchProperties = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/all-land-records", { credentials: "include" })
            if (!res.ok) throw new Error("Failed to load land records")
            const data = await res.json()
            setProperties(data.properties)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            const matchesSearch =
                searchQuery === "" ||
                p.bhuSetuId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.owner.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.owner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (p.district && p.district.toLowerCase().includes(searchQuery.toLowerCase()))
            return matchesSearch
        })
    }, [properties, searchQuery])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-slate-500">Loading global land registry...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex flex-col items-center max-w-sm text-center">
                    <AlertCircle className="size-10 mb-2" />
                    <h2 className="font-bold text-lg">Access Denied</h2>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 sm:p-10 mx-auto w-full space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Global Land Registry
                    </h1>
                    <p className="text-slate-500 mt-1">
                        View system-wide verified properties and land records.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 md:size-4 size-5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search BHU ID, owner, district..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Database className="size-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Registered Records</p>
                        <h3 className="text-2xl font-bold text-slate-900">{properties.length.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <CheckCircle2 className="size-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Verified By Officials</p>
                        <h3 className="text-2xl font-bold text-slate-900">{properties.filter(p => p.status === 'VERIFIED').length.toLocaleString()}</h3>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex items-center gap-4">
                    <div className="size-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <MapPin className="size-6" />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-500">Total Covered Area</p>
                        <h3 className="text-2xl font-bold text-slate-900">{formatArea(properties.reduce((sum, p) => sum + p.areaSqFt, 0))} <span className="text-sm font-normal text-slate-400">sqft</span></h3>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 pl-6">Property ID & Owner</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Details</th>
                                <th className="p-4">Type</th>
                                <th className="p-4 pr-6">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredProperties.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="font-bold text-emerald-700 font-mono text-sm bg-emerald-50 px-2 py-0.5 rounded w-fit mb-1">
                                            {p.bhuSetuId}
                                        </div>
                                        <div className="font-semibold text-slate-900">{p.owner.name}</div>
                                        <div className="text-slate-500 text-xs mt-0.5">{p.owner.email}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <MapPin className="size-3.5 text-slate-400 shrink-0" />
                                            {p.district}, {p.state}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 pl-5">
                                            Taluka: {p.taluka || "N/A"} • Plot: {p.surveyNumber || "N/A"}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-900">{formatArea(p.areaSqFt)} sqft</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            Registered: {new Date(p.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                    </td>
                                    <td className="p-4 font-medium text-slate-600">
                                        {p.type.replace(/_/g, " ")}
                                    </td>
                                    <td className="p-4 pr-6">
                                        {p.status === "VERIFIED" ? (
                                            <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold tracking-wider text-[10px] uppercase">
                                                <CheckCircle2 className="size-3" /> VERIFIED
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-700 border-slate-200 font-bold tracking-wider text-[10px] uppercase">
                                                {p.status}
                                            </Badge>
                                        )}
                                    </td>
                                </tr>
                            ))}

                            {filteredProperties.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Landmark className="size-8 text-slate-300 mb-2" />
                                            <p className="font-medium text-slate-600">No records found</p>
                                            <p className="text-sm">No verified land records match your criteria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
