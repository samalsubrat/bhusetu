"use client"

import { useEffect, useState, useMemo } from "react"
import { useAuth } from "@/hooks/use-auth"
import Link from "next/link"
import { Loader2, AlertCircle, RefreshCw, Landmark, MapPin, Inbox, Search, CheckCircle2, XCircle, CreditCard, FileEdit, ExternalLink, Timer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface User {
    id: string
    name: string
    email: string
    phone: string | null
}

interface Application {
    id: string
    regYear: number
    regNumber: number
    bhuSetuId: string | null
    status: string
    ownerName: string
    landArea: number
    paymentDeadline: string | null
    category: string
    district: string
    tehsil: string
    createdAt: string
    user: User
}

function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

function formatArea(area: number): string {
    return area.toLocaleString("en-IN")
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_RI_VERIFICATION":
            return (
                <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold tracking-wider uppercase">
                    <RefreshCw className="size-3" /> PENDING RI
                </Badge>
            )
        case "PENDING_ADDL_TAHASILDAR":
            return (
                <Badge variant="outline" className="gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold tracking-wider uppercase">
                    <RefreshCw className="size-3" /> PENDING TAHASILDAR
                </Badge>
            )
        case "VERIFIED":
            return (
                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold tracking-wider uppercase">
                    <CheckCircle2 className="size-3" /> VERIFIED
                </Badge>
            )
        case "REJECTED":
            return (
                <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200 text-[10px] font-bold tracking-wider uppercase">
                    <XCircle className="size-3" /> REJECTED
                </Badge>
            )
        case "PENDING_PAYMENT":
            return (
                <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-[10px] font-bold tracking-wider uppercase">
                    <CreditCard className="size-3" /> PENDING PAYMENT
                </Badge>
            )
        case "DRAFT":
            return (
                <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold tracking-wider uppercase">
                    <FileEdit className="size-3" /> DRAFT
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-700 border-slate-200 text-[10px] font-bold tracking-wider uppercase">
                    {status.replace(/_/g, " ")}
                </Badge>
            )
    }
}

export default function AllApplicationsPage() {
    const { user: currentUser } = useAuth()
    const [applications, setApplications] = useState<Application[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        fetchApplications()
    }, [])

    const fetchApplications = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/applications", { credentials: "include" })
            if (!res.ok) throw new Error("Failed to load applications")
            const data = await res.json()
            setApplications(data.applications)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const filteredApplications = useMemo(() => {
        return applications.filter(a => {
            const matchesSearch = 
                searchQuery === "" ||
                formatRegNumber(a.regYear, a.regNumber).toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (a.bhuSetuId && a.bhuSetuId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                a.district.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesSearch
        })
    }, [applications, searchQuery])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-slate-500">Loading all applications...</p>
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
                        All Applications Database
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Unfiltered view of all property registration requests, past and present.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 md:size-4 size-5 text-slate-400" />
                        <Input
                            type="text"
                            placeholder="Search REG ID, BHU ID, Owner, District..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 text-sm"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-max">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 pl-6">Reg ID / BHU ID</th>
                                <th className="p-4">Owner Identity</th>
                                <th className="p-4">Location Details</th>
                                <th className="p-4">Dates</th>
                                <th className="p-4">State</th>
                                <th className="p-4 pr-6 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredApplications.map((a) => (
                                <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6">
                                        <div className="font-mono font-bold text-primary text-sm mb-1 uppercase">
                                            {formatRegNumber(a.regYear, a.regNumber)}
                                        </div>
                                        {a.bhuSetuId ? (
                                            <div className="font-bold text-emerald-700 font-mono text-[11px] bg-emerald-50 px-2 py-0.5 rounded w-fit uppercase">
                                                {a.bhuSetuId}
                                            </div>
                                        ) : (
                                            <div className="font-semibold text-slate-400 font-mono text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit uppercase title='Not Minted Yet'">
                                                UNBOUND
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-slate-900">{a.ownerName}</div>
                                        <div className="text-slate-500 text-xs mt-0.5 font-medium">{a.user.email}</div>
                                        <div className="text-slate-400 text-xs mt-0.5">Area: {formatArea(a.landArea)} sqft</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        <div className="flex items-center gap-1.5 font-medium">
                                            <MapPin className="size-3.5 text-slate-400 shrink-0" />
                                            {a.district}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 pl-5">
                                            Taluka: {a.tehsil || "N/A"}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="text-slate-900 font-medium">
                                            {new Date(a.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-medium">
                                            <Timer className="size-3 text-slate-300" />
                                            {new Date(a.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(a.status)}
                                    </td>
                                    <td>
                                        <div className="flex justify-center">
                                            <Link href={`/dashboard/registration/review/${a.id}`}>
                                                <Button size="sm" variant="ghost" className="h-8 gap-1.5 font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                    View Details <ExternalLink className="size-3.5" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredApplications.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-12 text-center text-slate-500 italic">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="size-12 bg-slate-100 rounded-full flex items-center justify-center">
                                                <Inbox className="size-6 text-slate-300" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-600">No applications found</p>
                                                <p className="text-sm mt-0.5">There are no records matching your criteria.</p>
                                            </div>
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
