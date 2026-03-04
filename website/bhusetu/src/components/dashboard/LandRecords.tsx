"use client"

import Link from "next/link"
import { useState, useMemo } from "react"
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
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────
type LandStatus = "verified" | "in-progress" | "payment-pending" | "draft"
type SortKey = "area" | "status" | "lastUpdated"
type SortDir = "asc" | "desc"

interface LandParcel {
    propertyId: string
    location: string
    area: string          // formatted, e.g. "2,450"
    areaNum: number       // raw number for sorting
    status: LandStatus
    lastUpdated: string   // display string
    lastUpdatedTs: number // timestamp for sorting
}

// ─── Mock Data ───────────────────────────────────────────────────────
const LAND_PARCELS: LandParcel[] = [
    {
        propertyId: "BHU-8829-XJ",
        location: "Sector 45, Gurugram",
        area: "2,450",
        areaNum: 2450,
        status: "verified",
        lastUpdated: "Oct 12, 2023",
        lastUpdatedTs: new Date("2023-10-12").getTime(),
    },
    {
        propertyId: "BHU-1024-AK",
        location: "Civil Lines, Jaipur",
        area: "1,800",
        areaNum: 1800,
        status: "in-progress",
        lastUpdated: "Jan 04, 2024",
        lastUpdatedTs: new Date("2024-01-04").getTime(),
    },
    {
        propertyId: "BHU-5541-MK",
        location: "Whitefield, Bangalore",
        area: "3,200",
        areaNum: 3200,
        status: "verified",
        lastUpdated: "Aug 20, 2023",
        lastUpdatedTs: new Date("2023-08-20").getTime(),
    },
    {
        propertyId: "BHU-9921-PL",
        location: "New Town, Kolkata",
        area: "1,200",
        areaNum: 1200,
        status: "payment-pending",
        lastUpdated: "Dec 05, 2023",
        lastUpdatedTs: new Date("2023-12-05").getTime(),
    },
    {
        propertyId: "BHU-3347-RS",
        location: "Saheed Nagar, Bhubaneswar",
        area: "980",
        areaNum: 980,
        status: "draft",
        lastUpdated: "Feb 18, 2024",
        lastUpdatedTs: new Date("2024-02-18").getTime(),
    },
]

// ─── Status Config ───────────────────────────────────────────────────
const STATUS_ORDER: Record<LandStatus, number> = {
    draft: 0,
    "payment-pending": 1,
    "in-progress": 2,
    verified: 3,
}

const STATUS_CONFIG: Record<
    LandStatus,
    { label: string; icon: React.ReactNode; className: string }
> = {
    verified: {
        label: "Verified",
        icon: <CheckCircle2 className="size-3.5" />,
        className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
    "in-progress": {
        label: "In Progress",
        icon: <Loader2 className="size-3.5" />,
        className: "bg-amber-100 text-amber-700 border-amber-200",
    },
    "payment-pending": {
        label: "Payment Pending",
        icon: <CreditCard className="size-3.5" />,
        className: "bg-blue-100 text-blue-700 border-blue-200",
    },
    draft: {
        label: "Draft",
        icon: <FileEdit className="size-3.5" />,
        className: "bg-slate-100 text-slate-600 border-slate-200",
    },
}

const FILTER_OPTIONS: { value: LandStatus | "all"; label: string }[] = [
    { value: "all", label: "All Statuses" },
    { value: "verified", label: "Verified" },
    { value: "in-progress", label: "In Progress" },
    { value: "payment-pending", label: "Payment Pending" },
    { value: "draft", label: "Draft" },
]

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

// ─── Action Label Helper ─────────────────────────────────────────────
function getActionLabel(status: LandStatus) {
    switch (status) {
        case "verified": return "Manage"
        case "in-progress": return "Track"
        case "payment-pending": return "Pay Now"
        case "draft": return "Continue"
    }
}

// ─── Main Component ──────────────────────────────────────────────────
export default function LandRecords() {
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<LandStatus | "all">("all")
    const [sortKey, setSortKey] = useState<SortKey>("lastUpdated")
    const [sortDir, setSortDir] = useState<SortDir>("desc")

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
        } else {
            setSortKey(key)
            setSortDir("desc")
        }
    }

    const filteredAndSorted = useMemo(() => {
        // Filter
        let result = LAND_PARCELS.filter((parcel) => {
            const matchesSearch =
                searchQuery === "" ||
                parcel.propertyId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                parcel.location.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesStatus = statusFilter === "all" || parcel.status === statusFilter
            return matchesSearch && matchesStatus
        })

        // Sort
        result = [...result].sort((a, b) => {
            let cmp = 0
            switch (sortKey) {
                case "area":
                    cmp = a.areaNum - b.areaNum
                    break
                case "status":
                    cmp = STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
                    break
                case "lastUpdated":
                    cmp = a.lastUpdatedTs - b.lastUpdatedTs
                    break
            }
            return sortDir === "asc" ? cmp : -cmp
        })

        return result
    }, [searchQuery, statusFilter, sortKey, sortDir])

    const counts = {
        total: LAND_PARCELS.length,
        pending: LAND_PARCELS.filter(
            (p) => p.status === "in-progress" || p.status === "payment-pending"
        ).length,
        history: LAND_PARCELS.filter((p) => p.status === "verified").length,
    }

    const activeFilterLabel =
        FILTER_OPTIONS.find((o) => o.value === statusFilter)?.label ?? "All Statuses"

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 sm:p-10 mx-auto">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Land Records
                </h1>
                <p className="text-slate-500 mt-1">
                    Secure blockchain-based land management and registry overview.
                </p>
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
                    label="Verified History"
                    value={String(counts.history).padStart(2, "0")}
                    unit="Events"
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
                                placeholder="Search ID or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 text-sm"
                            />
                        </div>

                        {/* Status Filter — shadcn DropdownMenu */}
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
                                        setStatusFilter(val as LandStatus | "all")
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
                        {filteredAndSorted.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={6}
                                    className="px-6 py-12 text-center text-sm text-slate-400"
                                >
                                    No land parcels found matching your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSorted.map((parcel) => {
                                const statusCfg = STATUS_CONFIG[parcel.status]
                                return (
                                    <TableRow
                                        key={parcel.propertyId}
                                        className="hover:bg-slate-50/60 transition-colors"
                                    >
                                        <TableCell className="px-6 py-4">
                                            <span className="font-mono text-xs font-bold text-primary">
                                                {parcel.propertyId}
                                            </span>
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <MapPin className="size-4 text-slate-400 shrink-0" />
                                                {parcel.location}
                                            </div>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 font-medium text-sm">
                                            {parcel.area}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Badge
                                                variant="outline"
                                                className={`gap-1.5 px-2.5 py-1 text-xs font-bold ${statusCfg.className}`}
                                            >
                                                {statusCfg.icon}
                                                {statusCfg.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="px-6 py-4 text-sm text-slate-500">
                                            {parcel.lastUpdated}
                                        </TableCell>
                                        <TableCell className="px-6 py-4">
                                            <Link
                                                href={`/dashboard/land-records/${parcel.propertyId}`}
                                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-blue-700 transition-colors"
                                            >
                                                <Eye className="size-3.5" />
                                                {getActionLabel(parcel.status)}
                                            </Link>
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
    )
}
