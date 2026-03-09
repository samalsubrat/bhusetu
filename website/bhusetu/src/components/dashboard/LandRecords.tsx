"use client"

import Link from "next/link"
import { useState, useMemo, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    HomeIcon,
    Clock,
    History,
    MapPin,
    Search,
    Filter,
    Download,
    ShieldCheck,
    CheckCircle2,
    Loader2,
    CreditCard,
    FileEdit,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Eye,
    AlertCircle,
    XCircle,
    RefreshCw,
    Minus,
    Timer,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────
type RegistrationStatus = "DRAFT" | "PENDING_PAYMENT" | "PENDING_RI_VERIFICATION" | "PENDING_ADDL_TAHASILDAR" | "VERIFIED" | "REJECTED"
type SortKey = "regNumber" | "area" | "status" | "lastUpdated"
type SortDir = "asc" | "desc"

interface RegistrationRecord {
    id: string
    regYear: number
    regNumber: number
    bhuSetuId: string | null
    status: RegistrationStatus
    paymentDeadline: string | null
    ownerName: string
    landArea: number
    category: string
    district: string
    state: string
    tehsil: string
    plotNumber: string
    processingFee: number
    stampDuty: number
    totalAmount: number
    createdAt: string
    updatedAt: string
}

// ─── Status Config ───────────────────────────────────────────────────
const STATUS_ORDER: Record<RegistrationStatus, number> = {
    DRAFT: 0,
    PENDING_PAYMENT: 1,
    PENDING_RI_VERIFICATION: 2,
    PENDING_ADDL_TAHASILDAR: 3,
    VERIFIED: 4,
    REJECTED: 5,
}

const STATUS_CONFIG: Record<
    RegistrationStatus,
    { label: string; icon: React.ReactNode; className: string }
> = {
    VERIFIED: {
        label: "Verified",
        icon: <CheckCircle2 className="size-3.5" />,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    PENDING_RI_VERIFICATION: {
        label: "Pending RI Insp.",
        icon: <Loader2 className="size-3.5" />,
        className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    PENDING_ADDL_TAHASILDAR: {
        label: "Pending Tahasildar",
        icon: <Loader2 className="size-3.5" />,
        className: "bg-indigo-100 text-indigo-700 border-indigo-200",
    },
    PENDING_PAYMENT: {
        label: "Payment Pending",
        icon: <CreditCard className="size-3.5" />,
        className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    DRAFT: {
        label: "Draft",
        icon: <FileEdit className="size-3.5" />,
        className: "bg-slate-100 text-slate-600 border-slate-200",
    },
    REJECTED: {
        label: "Rejected",
        icon: <XCircle className="size-3.5" />,
        className: "bg-red-100 text-red-700 border-red-200",
    },
}

const FILTER_OPTIONS: { value: RegistrationStatus | "all"; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "VERIFIED", label: "Verified" },
    { value: "PENDING_RI_VERIFICATION", label: "Pending RI Insp." },
    { value: "PENDING_ADDL_TAHASILDAR", label: "Pending Addl Tahasildar" },
    { value: "PENDING_PAYMENT", label: "Payment Pending" },
    { value: "DRAFT", label: "Draft" },
    { value: "REJECTED", label: "Rejected" },
]

// ─── Helpers ─────────────────────────────────────────────────────────
function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("en-IN", {
        month: "short",
        day: "2-digit",
        year: "numeric",
    })
}

function formatArea(area: number): string {
    return area.toLocaleString("en-IN")
}

function getPaymentTimeRemaining(deadline: string | null): { text: string; urgent: boolean; expired: boolean } | null {
    if (!deadline) return null
    const now = new Date()
    const dl = new Date(deadline)
    const diffMs = dl.getTime() - now.getTime()

    if (diffMs <= 0) return { text: "Expired", urgent: true, expired: true }

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    const remainingHours = diffHours % 24

    if (diffDays > 0) {
        return { text: `${diffDays}d ${remainingHours}h left`, urgent: diffDays === 0, expired: false }
    }
    return { text: `${diffHours}h left`, urgent: true, expired: false }
}

function getLocation(record: RegistrationRecord): string {
    const parts = [record.tehsil, record.district, record.state].filter(Boolean)
    return parts.join(", ")
}

// ─── Summary Card ────────────────────────────────────────────────────
function SummaryCard({
    icon,
    iconBg,
    label,
    value,
    unit,
    actionLabel,
    actionHref,
}: {
    icon: React.ReactNode
    iconBg: string
    label: string
    value: string | number
    unit: string
    actionLabel: string
    actionHref: string
}) {
    return (
        <div className="flex items-center gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${iconBg}`}>
                {icon}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <h3 className="text-2xl font-bold text-slate-900">
                    {value} <span className="text-sm font-normal text-slate-400">{unit}</span>
                </h3>
            </div>
            <Link href={actionHref} className="text-xs font-semibold text-primary hover:underline shrink-0">
                {actionLabel}
            </Link>
        </div>
    )
}

// ─── Sortable Column Header ──────────────────────────────────────────
function SortableHead({
    label,
    sortKey,
    currentKey,
    currentDir,
    onSort,
}: {
    label: string
    sortKey: SortKey
    currentKey: SortKey
    currentDir: SortDir
    onSort: (key: SortKey) => void
}) {
    const isActive = currentKey === sortKey
    return (
        <TableHead className="px-6 py-3.5">
            <button
                onClick={() => onSort(sortKey)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-900 transition-colors cursor-pointer select-none"
            >
                {label}
                {isActive ? (
                    currentDir === "asc" ? (
                        <ArrowUp className="size-3 text-primary" />
                    ) : (
                        <ArrowDown className="size-3 text-primary" />
                    )
                ) : (
                    <ArrowUpDown className="size-3 text-slate-300" />
                )}
            </button>
        </TableHead>
    )
}

// ─── Action Logic ────────────────────────────────────────────────────
function getActionConfig(record: RegistrationRecord): { label: string; href: string; icon: React.ReactNode; variant: "default" | "pay" | "muted" } {
    switch (record.status) {
        case "VERIFIED":
            return {
                label: "Manage",
                href: `/dashboard/land-records/${record.bhuSetuId}`,
                icon: <Eye className="size-3.5" />,
                variant: "default",
            }
        case "PENDING_RI_VERIFICATION":
        case "PENDING_ADDL_TAHASILDAR":
            return {
                label: "Track",
                href: `/dashboard/land-records/${record.id}`,
                icon: <Eye className="size-3.5" />,
                variant: "default",
            }
        case "PENDING_PAYMENT": {
            const timeInfo = getPaymentTimeRemaining(record.paymentDeadline)
            return {
                label: timeInfo?.expired ? "Expired" : "Pay Now",
                href: timeInfo?.expired ? "#" : `/dashboard/registration/review/${record.id}`,
                icon: <CreditCard className="size-3.5" />,
                variant: timeInfo?.expired ? "muted" : "pay",
            }
        }
        case "DRAFT":
            return {
                label: "Continue",
                href: `/dashboard/registration/review/${record.id}`,
                icon: <FileEdit className="size-3.5" />,
                variant: "default",
            }
        case "REJECTED":
            return {
                label: "View",
                href: `/dashboard/land-records/${record.id}`,
                icon: <AlertCircle className="size-3.5" />,
                variant: "muted",
            }
    }
}

// ─── Loading Skeleton ────────────────────────────────────────────────
function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-6 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 w-20 rounded bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 w-36 rounded bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-5 w-24 rounded-full bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 w-24 rounded bg-slate-100" /></TableCell>
                    <TableCell className="px-6 py-4"><div className="h-4 w-16 rounded bg-slate-100" /></TableCell>
                </TableRow>
            ))}
        </>
    )
}

// ─── Main Component ──────────────────────────────────────────────────
export default function LandRecords() {
    const [records, setRecords] = useState<RegistrationRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<RegistrationStatus | "all">("all")
    const [sortKey, setSortKey] = useState<SortKey>("lastUpdated")
    const [sortDir, setSortDir] = useState<SortDir>("desc")

    const fetchRecords = useCallback(async () => {
        try {
            setLoading(true)
            const res = await fetch("/api/registrations", { credentials: "include" })
            if (res.ok) {
                const data = await res.json()
                setRecords(data.registrations ?? [])
            }
        } catch {
            // silently fail — show empty state
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchRecords()
    }, [fetchRecords])

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const filteredAndSorted = useMemo(() => {
        let result = records.filter((record) => {
            const regId = formatRegNumber(record.regYear, record.regNumber)
            const location = getLocation(record)
            const matchesSearch =
                searchQuery === "" ||
                regId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                record.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (record.bhuSetuId?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
            const matchesStatus = statusFilter === "all" || record.status === statusFilter
            return matchesSearch && matchesStatus
        })

        result = [...result].sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case "regNumber":
                    cmp = a.regNumber - b.regNumber
                    break
                case "area":
                    cmp = a.landArea - b.landArea
                    break
                case "status":
                    cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
                    break
                case "lastUpdated":
                    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
                    break
            }
            return sortDir === "asc" ? cmp : -cmp
        })

        return result
    }, [records, searchQuery, statusFilter, sortKey, sortDir])

    const counts = {
        total: records.length,
        pending: records.filter(
            (r) => r.status === "PENDING_RI_VERIFICATION" || r.status === "PENDING_ADDL_TAHASILDAR" || r.status === "PENDING_PAYMENT"
        ).length,
        verified: records.filter((r) => r.status === "VERIFIED").length,
    }

    const activeFilterLabel =
        FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "All Statuses"

    return (
        <TooltipProvider>
            <div className="flex flex-1 flex-col gap-8 p-6 sm:p-10 mx-auto">
                {/* Page Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                            Land Records
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Secure blockchain-based land management and registry overview.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchRecords}
                        disabled={loading}
                        className="gap-1.5 text-xs text-slate-500 hover:text-slate-900"
                    >
                        <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    <SummaryCard
                        icon={<HomeIcon className="size-7 text-primary" />}
                        iconBg="bg-primary/10"
                        label="My Properties"
                        value={String(counts.total).padStart(2, "0")}
                        unit="Parcels"
                        actionLabel="View All"
                        actionHref="#"
                    />
                    <SummaryCard
                        icon={<Clock className="size-7 text-amber-600" />}
                        iconBg="bg-amber-500/10"
                        label="Pending Requests"
                        value={String(counts.pending).padStart(2, "0")}
                        unit="Active"
                        actionLabel="Track"
                        actionHref="#"
                    />
                    <SummaryCard
                        icon={<History className="size-7 text-emerald-600" />}
                        iconBg="bg-emerald-500/10"
                        label="Verified Properties"
                        value={String(counts.verified).padStart(2, "0")}
                        unit="Confirmed"
                        actionLabel="History"
                        actionHref="#"
                    />
                </div>



                {/* Land Parcels Table */}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 p-5">
                        <h2 className="text-lg font-bold text-slate-900">
                            Registered Land Parcels
                        </h2>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            {/* Search */}
                            <div className="relative flex-1 sm:flex-none sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                <Input
                                    type="text"
                                    placeholder="Search REG ID, location..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                            </div>

                            {/* Status Filter */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                                        <Filter className="size-3.5" />
                                        {activeFilterLabel}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuLabel className="text-xs text-slate-500">
                                        Filter by Status
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={statusFilter}
                                        onValueChange={(val) =>
                                            setStatusFilter(val as RegistrationStatus | "all")
                                        }
                                    >
                                        {FILTER_OPTIONS.map((opt) => (
                                            <DropdownMenuRadioItem
                                                key={opt.value}
                                                value={opt.value}
                                                className="text-sm cursor-pointer"
                                            >
                                                {opt.label}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Export */}
                            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                                <Download className="size-3.5" />
                                Export
                            </Button>
                        </div>
                    </div>

                    {/* Table */}
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                                <SortableHead
                                    label="Reg ID"
                                    sortKey="regNumber"
                                    currentKey={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                                <TableHead className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Property ID
                                </TableHead>
                                <TableHead className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Location
                                </TableHead>
                                <SortableHead
                                    label="Area (Sq. Ft)"
                                    sortKey="area"
                                    currentKey={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                                <SortableHead
                                    label="Status"
                                    sortKey="status"
                                    currentKey={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                                <SortableHead
                                    label="Last Updated"
                                    sortKey="lastUpdated"
                                    currentKey={sortKey}
                                    currentDir={sortDir}
                                    onSort={handleSort}
                                />
                                <TableHead className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableSkeleton />
                            ) : filteredAndSorted.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        colSpan={7}
                                        className="px-6 py-16 text-center"
                                    >
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center">
                                                <Search className="size-5 text-slate-400" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-600">
                                                    No land records found
                                                </p>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    {records.length === 0
                                                        ? "Start a new registration to see your records here."
                                                        : "Try adjusting your search or filter criteria."}
                                                </p>
                                            </div>
                                            {records.length === 0 && (
                                                <Button asChild size="sm" className="mt-2">
                                                    <Link href="/dashboard/registration">
                                                        New Registration
                                                    </Link>
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAndSorted.map((record) => {
                                    const statusCfg = STATUS_CONFIG[record.status]
                                    const action = getActionConfig(record)
                                    const timeInfo = record.status === "PENDING_PAYMENT"
                                        ? getPaymentTimeRemaining(record.paymentDeadline)
                                        : null

                                    return (
                                        <TableRow
                                            key={record.id}
                                            className="hover:bg-slate-50/60 transition-colors"
                                        >
                                            {/* Reg ID */}
                                            <TableCell className="px-6 py-4">
                                                <span className="font-mono text-xs font-bold text-primary">
                                                    {formatRegNumber(record.regYear, record.regNumber)}
                                                </span>
                                            </TableCell>

                                            {/* Property ID (BHU ID) — only shown when verified */}
                                            <TableCell className="px-6 py-4">
                                                {record.bhuSetuId ? (
                                                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                                                        {record.bhuSetuId}
                                                    </span>
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger>
                                                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 italic">
                                                                <Minus className="size-3" />
                                                                Pending
                                                            </span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p className="text-xs">Property ID is assigned after registrar verification & smart contract execution.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </TableCell>

                                            {/* Location */}
                                            <TableCell className="px-6 py-4">
                                                <div className="flex items-center gap-2 text-sm text-slate-700">
                                                    <MapPin className="size-4 text-slate-400 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{getLocation(record)}</span>
                                                </div>
                                            </TableCell>

                                            {/* Area */}
                                            <TableCell className="px-6 py-4 font-medium text-sm">
                                                {formatArea(record.landArea)}
                                            </TableCell>

                                            {/* Status */}
                                            <TableCell className="px-6 py-4">
                                                <div className="flex flex-col gap-1.5">
                                                    <Badge
                                                        variant="outline"
                                                        className={`gap-1.5 px-2.5 py-1 text-xs font-bold w-fit ${statusCfg.className}`}
                                                    >
                                                        {statusCfg.icon}
                                                        {statusCfg.label}
                                                    </Badge>
                                                    {timeInfo && (
                                                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${timeInfo.expired ? "text-red-600" : timeInfo.urgent ? "text-orange-600" : "text-blue-600"}`}>
                                                            <Timer className="size-3" />
                                                            {timeInfo.text}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* Last Updated */}
                                            <TableCell className="px-6 py-4 text-sm text-slate-500">
                                                {formatDate(record.updatedAt)}
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="px-6 py-4">
                                                {action.variant === "pay" ? (
                                                    <Link
                                                        href={action.href}
                                                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-primary/25 hover:bg-primary/90 transition-colors"
                                                    >
                                                        {action.icon}
                                                        {action.label}
                                                    </Link>
                                                ) : action.variant === "muted" ? (
                                                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-400 cursor-not-allowed">
                                                        {action.icon}
                                                        {action.label}
                                                    </span>
                                                ) : (
                                                    <Link
                                                        href={action.href}
                                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-blue-700 transition-colors"
                                                    >
                                                        {action.icon}
                                                        {action.label}
                                                    </Link>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Blockchain Notice */}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pb-4">
                    <ShieldCheck className="size-4" />
                    All records are cryptographically secured and immutable on the
                    national BhuSetu blockchain network.
                </div>
            </div>
        </TooltipProvider>
    )
}
