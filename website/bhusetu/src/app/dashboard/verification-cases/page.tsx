"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Loader2, ShieldCheck, AlertCircle, RefreshCw, XCircle, CheckCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface User {
    id: string
    name: string
    email: string
    phone: string | null
}

interface VerificationCase {
    id: string
    regYear: number
    regNumber: number
    status: string
    ownerName: string
    landArea: number
    category: string
    district: string
    tehsil: string
    createdAt: string
    user: User
}

function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_RI_VERIFICATION":
            return (
                <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold whitespace-nowrap">
                    <RefreshCw className="size-3" />
                    Pending RI Insp.
                </Badge>
            )
        case "PENDING_ADDL_TAHASILDAR":
            return (
                <Badge variant="outline" className="gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold whitespace-nowrap">
                    <RefreshCw className="size-3" />
                    Pending Add. Tahasildar
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-700 border-slate-200 text-xs font-bold whitespace-nowrap">
                    {status.replace(/_/g, " ")}
                </Badge>
            )
    }
}

export default function VerificationCasesPage() {
    const { user: currentUser } = useAuth()
    const [cases, setCases] = useState<VerificationCase[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")

    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        fetchCases()
    }, [])

    const fetchCases = async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/verification-cases", { credentials: "include" })
            if (!res.ok) throw new Error("Failed to load verification cases")
            const data = await res.json()
            setCases(data.cases)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
        try {
            if (!confirm(`Are you sure you want to ${action.toLowerCase()} this case?`)) return

            setProcessingId(id)
            const res = await fetch(`/api/verification-cases/${id}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.error || "Action failed")
            }

            // Case updated successfully! We can visually remove it from the list since it advanced to the next state
            alert(`Successfully ${action.toLowerCase()}d!`)
            setCases(prev => prev.filter(c => c.id !== id))
        } catch (err: any) {
            alert(`Error: ${err.message}`)
        } finally {
            setProcessingId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500">Loading cases...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] p-6">
                <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex flex-col items-center max-w-sm text-center">
                    <AlertCircle className="size-10 mb-2" />
                    <h2 className="font-bold text-lg">Error</h2>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 sm:p-10 max-w-7xl mx-auto w-full space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Assigned Verification Cases
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Review and vet assigned registration processes.
                    </p>
                </div>
                <Button onClick={fetchCases} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className="size-4" />
                    Refresh
                </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="p-4 pl-6">Registration ID</th>
                                <th className="p-4">Owner Name</th>
                                <th className="p-4">Property Location</th>
                                <th className="p-4">Submitted Date</th>
                                <th className="p-4">State</th>
                                <th className="p-4 pr-6 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                            {cases.map((c) => (
                                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="p-4 pl-6 font-mono font-bold text-slate-700">
                                        {formatRegNumber(c.regYear, c.regNumber)}
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-slate-900">{c.ownerName}</div>
                                        <div className="text-slate-500 text-xs mt-0.5">{c.user.email}</div>
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {c.tehsil}, {c.district}
                                    </td>
                                    <td className="p-4 text-slate-600">
                                        {new Date(c.createdAt).toLocaleDateString("en-IN", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric"
                                        })}
                                    </td>
                                    <td className="p-4">
                                        {getStatusBadge(c.status)}
                                    </td>
                                    <td className="p-4 pr-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200 h-8 gap-1.5"
                                                disabled={processingId === c.id}
                                                onClick={() => handleAction(c.id, "APPROVE")}
                                            >
                                                {processingId === c.id ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle className="size-3.5" />}
                                                Verify & Advance
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 h-8 gap-1.5 px-2"
                                                disabled={processingId === c.id}
                                                onClick={() => handleAction(c.id, "REJECT")}
                                                title="Reject Application"
                                            >
                                                <XCircle className="size-3.5" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {cases.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                                        Great! No pending cases awaiting your verification at this moment.
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
