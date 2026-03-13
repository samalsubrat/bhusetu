"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    Loader2,
    ChevronLeft,
    CheckCircle,
    User,
    MapPin,
    FileText,
    CreditCard,
    ExternalLink,
    ShieldCheck,
    Copy,
    Check,
    Link2,
    Landmark,
    Compass,
    CalendarDays,
    Boxes,
    IndianRupee,
    AlertCircle,
    Clock,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────
interface UploadedDocument {
    id: string
    cid: string
    name: string
    size: number
    mimeType: string
    category: string
}

interface PropertyData {
    id: string
    bhuSetuId: string
    regYear: number
    regNumber: number
    status: string
    ownerName: string
    landArea: number
    taxPaid: boolean
    category: string
    northBoundary: string
    southBoundary: string
    eastBoundary: string
    westBoundary: string
    pincode: string
    state: string
    district: string
    postOffice: string
    tehsil: string
    plotNumber: string
    documents: UploadedDocument[] | unknown
    processingFee: number
    stampDuty: number
    totalAmount: number
    createdAt: string
    updatedAt: string
    user: {
        id: string
        name: string
        email: string
        phone: string | null
    }
}

interface BlockchainRecord {
    bhuSetuId: string
    registrationId: string
    regYear: number
    regNumber: number
    ownerName: string
    ownerEmail: string
    category: string
    landAreaSqFt: number
    taxPaid: boolean
    verifiedBy: string
    verifiedAt: number
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
    })
}

function formatTimestamp(ts: number): string {
    return new Date(ts * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    })
}

function formatCurrency(amount: number): string {
    return `₹${amount.toLocaleString("en-IN")}`
}

// ─── InfoRow ─────────────────────────────────────────────────────────
function InfoRow({ icon, label, value, mono }: { icon: React.ReactNode; label: string; value: string | React.ReactNode; mono?: boolean }) {
    return (
        <div className="flex items-start gap-3 py-2.5">
            <div className="mt-0.5 text-slate-400 shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-medium text-slate-800 mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
            </div>
        </div>
    )
}

// ─── Section Card ────────────────────────────────────────────────────
function SectionCard({ title, icon, children, accent }: {
    title: string
    icon: React.ReactNode
    children: React.ReactNode
    accent?: string
}) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className={`flex items-center gap-2.5 px-6 py-4 border-b border-slate-100 ${accent || ""}`}>
                <div className="text-slate-600">{icon}</div>
                <h2 className="text-sm font-bold text-slate-900 tracking-wide uppercase">{title}</h2>
            </div>
            <div className="px-6 py-4">{children}</div>
        </div>
    )
}

// ─── Copy Button ─────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false)
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleCopy}
                        className="p-1 hover:bg-slate-100 rounded transition-colors"
                    >
                        {copied
                            ? <Check className="size-3.5 text-green-600" />
                            : <Copy className="size-3.5 text-slate-400" />
                        }
                    </button>
                </TooltipTrigger>
                <TooltipContent><p className="text-xs">{copied ? "Copied!" : "Copy"}</p></TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}

// ─── Loading Skeleton ────────────────────────────────────────────────
function PageSkeleton() {
    return (
        <div className="p-6 sm:p-10 mx-auto space-y-6 animate-pulse">
            <div className="h-5 w-28 rounded bg-slate-100" />
            <div className="h-8 w-64 rounded bg-slate-100" />
            <div className="h-4 w-40 rounded bg-slate-100" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-56 rounded-xl bg-slate-50 border border-slate-100" />
                ))}
            </div>
        </div>
    )
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function PropertyDetailPage({
    params,
}: {
    params: Promise<{ propertyId: string }>
}) {
    const { propertyId } = use(params)
    const router = useRouter()
    const [property, setProperty] = useState<PropertyData | null>(null)
    const [blockchain, setBlockchain] = useState<BlockchainRecord | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [openingFile, setOpeningFile] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProperty() {
            try {
                setLoading(true)
                const res = await fetch(`/api/land-records/${propertyId}`, {
                    credentials: "include",
                })
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Property not found")
                    throw new Error("Failed to load property")
                }
                const data = await res.json()
                setProperty(data.registration)
                setBlockchain(data.blockchain)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong")
            } finally {
                setLoading(false)
            }
        }
        fetchProperty()
    }, [propertyId])

    const handleOpenFile = async (file: UploadedDocument) => {
        try {
            setOpeningFile(file.cid)
            const res = await fetch("/api/files/view", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cid: file.cid, fileName: file.name }),
            })
            if (res.ok) {
                const data = await res.json()
                window.open(data.url, "_blank")
            }
        } catch {
            // silently fail
        } finally {
            setOpeningFile(null)
        }
    }

    // ── Loading / Error states ───────────────────────────────────────
    if (loading) return <PageSkeleton />

    if (error || !property) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center space-y-4">
                    <div className="mx-auto size-14 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="size-7 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {error || "Property not found"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            The property record you&apos;re looking for couldn&apos;t be loaded.
                        </p>
                    </div>
                    <Button onClick={() => router.push("/dashboard/land-records")} variant="outline">
                        Back to Land Records
                    </Button>
                </div>
            </div>
        )
    }

    const documents: UploadedDocument[] = Array.isArray(property.documents) ? property.documents : []
    const isVerified = property.status === "VERIFIED"

    return (
        <div className="p-6 sm:p-10 mx-auto space-y-6">
            {/* ── Header ─────────────────────────────────────────────── */}
            <div>
                <button
                    onClick={() => router.push("/dashboard/land-records")}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors"
                >
                    <ChevronLeft className="size-4" />
                    Back to Land Records
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                        {/* BHU Property ID — hero element */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                {property.bhuSetuId}
                            </h1>
                            <CopyButton text={property.bhuSetuId} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-sm text-slate-500">
                                {formatRegNumber(property.regYear, property.regNumber)}
                            </span>
                            {isVerified ? (
                                <Badge variant="outline" className="gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                                    <CheckCircle className="size-3" />
                                    Verified & Recorded On-Chain
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="gap-1 bg-amber-50 text-amber-700 border-amber-200 text-xs font-bold">
                                    <Clock className="size-3" />
                                    {property.status.replace(/_/g, " ")}
                                </Badge>
                            )}
                        </div>
                        <p className="text-slate-500 text-sm">
                            Registered on {formatDate(property.createdAt)}
                        </p>
                    </div>

                    {/* Quick action */}
                    <Button
                        variant="outline"
                        className="gap-1.5 text-xs border-slate-200 shrink-0"
                        onClick={() => window.print()}
                    >
                        <FileText className="size-3.5" />
                        Print Record
                    </Button>
                </div>
            </div>

            {/* ── Blockchain Verification Banner ─────────────────────── */}
            {blockchain && (
                <div className="rounded-xl border border-emerald-200 bg-linear-to-r from-emerald-50 to-green-50 px-6 py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="size-10 rounded-full bg-emerald-100 flex items-center justify-center">
                            <ShieldCheck className="size-5 text-emerald-600" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-emerald-900">Blockchain Verified</h3>
                            <p className="text-xs text-emerald-700">
                                This property record is permanently stored on the BhuSetu blockchain.
                            </p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-white/70 rounded-lg px-3 py-2 border border-emerald-100">
                            <span className="text-emerald-600 font-medium">Verified By</span>
                            <p className="font-mono text-slate-700 truncate mt-0.5">{blockchain.verifiedBy}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg px-3 py-2 border border-emerald-100">
                            <span className="text-emerald-600 font-medium">Verified At</span>
                            <p className="text-slate-700 mt-0.5">{formatTimestamp(blockchain.verifiedAt)}</p>
                        </div>
                        <div className="bg-white/70 rounded-lg px-3 py-2 border border-emerald-100">
                            <span className="text-emerald-600 font-medium">On-Chain Area</span>
                            <p className="text-slate-700 mt-0.5">{blockchain.landAreaSqFt.toLocaleString("en-IN")} sq.ft</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Content Grid ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Owner Details */}
                <SectionCard
                    title="Owner Details"
                    icon={<User className="size-4" />}
                >
                    <div className="divide-y divide-slate-50">
                        <InfoRow icon={<User className="size-4" />} label="Full Name" value={property.ownerName} />
                        <InfoRow icon={<FileText className="size-4" />} label="Email" value={property.user.email} />
                        {property.user.phone && (
                            <InfoRow icon={<FileText className="size-4" />} label="Phone" value={property.user.phone} />
                        )}
                    </div>
                </SectionCard>

                {/* Property Details */}
                <SectionCard
                    title="Property Details"
                    icon={<Landmark className="size-4" />}
                >
                    <div className="divide-y divide-slate-50">
                        <InfoRow icon={<Boxes className="size-4" />} label="Category" value={property.category} />
                        <InfoRow
                            icon={<Landmark className="size-4" />}
                            label="Land Area"
                            value={`${property.landArea.toLocaleString("en-IN")} sq.ft`}
                        />
                        <InfoRow icon={<FileText className="size-4" />} label="Plot Number" value={property.plotNumber} mono />
                        <InfoRow
                            icon={<CheckCircle className="size-4" />}
                            label="Tax Status"
                            value={
                                property.taxPaid
                                    ? <span className="text-emerald-700 font-semibold">✓ Tax Paid</span>
                                    : <span className="text-red-600 font-semibold">✗ Tax Unpaid</span>
                            }
                        />
                    </div>
                </SectionCard>

                {/* Location */}
                <SectionCard
                    title="Location"
                    icon={<MapPin className="size-4" />}
                >
                    <div className="divide-y divide-slate-50">
                        <InfoRow icon={<MapPin className="size-4" />} label="State" value={property.state} />
                        <InfoRow icon={<MapPin className="size-4" />} label="District" value={property.district} />
                        <InfoRow icon={<MapPin className="size-4" />} label="Tehsil" value={property.tehsil} />
                        <InfoRow icon={<MapPin className="size-4" />} label="Post Office" value={property.postOffice} />
                        <InfoRow icon={<MapPin className="size-4" />} label="Pincode" value={property.pincode} mono />
                    </div>
                </SectionCard>

                {/* Boundaries */}
                <SectionCard
                    title="Boundaries"
                    icon={<Compass className="size-4" />}
                >
                    <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">North</p>
                            <p className="text-sm font-medium text-slate-700">{property.northBoundary}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">South</p>
                            <p className="text-sm font-medium text-slate-700">{property.southBoundary}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">East</p>
                            <p className="text-sm font-medium text-slate-700">{property.eastBoundary}</p>
                        </div>
                        <div className="rounded-lg bg-slate-50 border border-slate-100 p-3 text-center">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">West</p>
                            <p className="text-sm font-medium text-slate-700">{property.westBoundary}</p>
                        </div>
                    </div>
                </SectionCard>

                {/* Fee Breakdown */}
                <SectionCard
                    title="Fee Breakdown"
                    icon={<IndianRupee className="size-4" />}
                >
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-500">Processing Fee</span>
                            <span className="text-sm font-semibold text-slate-800">{formatCurrency(property.processingFee)}</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-500">Stamp Duty</span>
                            <span className="text-sm font-semibold text-slate-800">{formatCurrency(property.stampDuty)}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-3 flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-900">Total Amount</span>
                            <span className="text-base font-extrabold text-primary">{formatCurrency(property.totalAmount)}</span>
                        </div>
                    </div>
                </SectionCard>

                {/* Documents */}
                <SectionCard
                    title={`Documents (${documents.length})`}
                    icon={<FileText className="size-4" />}
                >
                    {documents.length === 0 ? (
                        <p className="text-sm text-slate-400 italic py-4 text-center">No documents uploaded</p>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between py-3 gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="size-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                                            <FileText className="size-4 text-indigo-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-slate-800 truncate">{doc.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {doc.category} · {(doc.size / 1024).toFixed(0)} KB
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="gap-1 text-xs text-primary shrink-0"
                                        disabled={openingFile === doc.cid}
                                        onClick={() => handleOpenFile(doc)}
                                    >
                                        {openingFile === doc.cid
                                            ? <Loader2 className="size-3 animate-spin" />
                                            : <ExternalLink className="size-3" />
                                        }
                                        View
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>
            </div>

            {/* ── Timeline / Metadata ────────────────────────────────── */}
            <SectionCard
                title="Registration Timeline"
                icon={<CalendarDays className="size-4" />}
            >
                <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
                    <div className="flex items-center gap-3">
                        <div className="size-2.5 rounded-full bg-slate-300" />
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Created</p>
                            <p className="text-sm font-semibold text-slate-700">{formatDate(property.createdAt)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="size-2.5 rounded-full bg-blue-400" />
                        <div>
                            <p className="text-xs text-slate-400 font-medium">Last Updated</p>
                            <p className="text-sm font-semibold text-slate-700">{formatDate(property.updatedAt)}</p>
                        </div>
                    </div>
                    {blockchain && (
                        <div className="flex items-center gap-3">
                            <div className="size-2.5 rounded-full bg-emerald-500" />
                            <div>
                                <p className="text-xs text-slate-400 font-medium">Blockchain Verified</p>
                                <p className="text-sm font-semibold text-emerald-700">{formatTimestamp(blockchain.verifiedAt)}</p>
                            </div>
                        </div>
                    )}
                </div>
            </SectionCard>

            {/* ── Footer Notice ───────────────────────────────────────── */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pb-6">
                <ShieldCheck className="size-4" />
                This record is cryptographically secured and immutable on the BhuSetu blockchain network.
            </div>
        </div>
    )
}
