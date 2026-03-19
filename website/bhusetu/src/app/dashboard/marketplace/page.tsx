"use client"

import Link from "next/link"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Search,
    MapPin,
    Building2,
    Loader2,
    Landmark,
    Filter,
} from "lucide-react"

// Types
interface MarketplaceListing {
    id: string
    title: string
    description: string | null
    listedPriceInPaise: string
    listedAt: string
    offersCount: number
    registration: {
        bhuSetuId: string | null
        ownerName: string
        category: string
        district: string
        state: string
        tehsil: string
        landArea: number
    }
    listedByUser: {
        id: string
        name: string
    }
}

export default function MarketplacePage() {
    const [listings, setListings] = useState<MarketplaceListing[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [category, setCategory] = useState("all")
    const [sort, setSort] = useState("newest")

    const fetchListings = useCallback(async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams()
            if (search) params.append("search", search)
            if (category !== "all") params.append("category", category)
            params.append("sort", sort)

            const res = await fetch(`/api/marketplace?${params.toString()}`)
            if (res.ok) {
                const data = await res.json()
                setListings(data.listings)
            }
        } catch (error) {
            console.error("Failed to fetch listings", error)
        } finally {
            setLoading(false)
        }
    }, [search, category, sort])

    useEffect(() => {
        const debounce = setTimeout(() => {
            fetchListings()
        }, 500)
        return () => clearTimeout(debounce)
    }, [fetchListings])

    const formatCurrency = (paise: string | number) => {
        const rupees = Number(paise) / 100
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(rupees)
    }

    return (
        <div className="flex-1 space-y-6 p-6 sm:p-10 mx-auto max-w-7xl">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
                    <Landmark className="size-8 text-primary" />
                    Property Marketplace
                </h1>
                <p className="text-slate-500 mt-2">
                    Browse verified land records available for purchase. Pitch offerings directly to owners.
                </p>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full relative">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                        Search Properties
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                            placeholder="Search by title, location, or Property ID..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="w-full md:w-48 shrink-0">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                        Category
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger>
                            <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            <SelectItem value="Residential">Residential</SelectItem>
                            <SelectItem value="Commercial">Commercial</SelectItem>
                            <SelectItem value="Agricultural">Agricultural</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="w-full md:w-48 shrink-0">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                        Sort By
                    </label>
                    <Select value={sort} onValueChange={setSort}>
                        <SelectTrigger>
                            <SelectValue placeholder="Sort order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="newest">Newest First</SelectItem>
                            <SelectItem value="oldest">Oldest First</SelectItem>
                            <SelectItem value="price_asc">Price: Low to High</SelectItem>
                            <SelectItem value="price_desc">Price: High to Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Listings Grid */}
            <div className="relative min-h-[400px]">
                {loading && listings.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="size-8 animate-spin text-primary" />
                    </div>
                ) : listings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        <Filter className="size-10 text-slate-400 mb-4" />
                        <h3 className="text-lg font-bold text-slate-900">No properties found</h3>
                        <p className="text-slate-500 mt-1 max-w-sm">
                            We couldn&apos;t find any properties matching your current search and filter criteria.
                        </p>
                        <Button
                            variant="outline"
                            className="mt-6"
                            onClick={() => {
                                setSearch("")
                                setCategory("all")
                            }}
                        >
                            Clear Filters
                        </Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {listings.map((listing) => (
                            <Card key={listing.id} className="group hover:shadow-lg transition-all duration-300 border-slate-200 overflow-hidden flex flex-col">
                                <CardHeader className="p-5 bg-slate-50/50 border-b border-slate-100">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge variant="outline" className="bg-white font-medium text-xs">
                                            {listing.registration.category}
                                        </Badge>
                                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-50 font-bold border-blue-200">
                                            {listing.offersCount} Offers
                                        </Badge>
                                    </div>
                                    <CardTitle className="line-clamp-2 text-lg text-slate-900 group-hover:text-primary transition-colors">
                                        {listing.title}
                                    </CardTitle>
                                    <CardDescription className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                                        <MapPin className="size-3.5" />
                                        {listing.registration.tehsil}, {listing.registration.district}, {listing.registration.state}
                                    </CardDescription>
                                </CardHeader>
                                
                                <CardContent className="p-5 flex-1">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">Land Area</p>
                                            <p className="font-semibold text-sm text-slate-700 flex items-center gap-1.5">
                                                <Building2 className="size-3.5 text-slate-400" />
                                                {listing.registration.landArea.toLocaleString()} sq.ft
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">BHU ID</p>
                                            <p className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-flex">
                                                {listing.registration.bhuSetuId}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                        {listing.description || "No description provided."}
                                    </p>
                                    <div className="pt-4 border-t border-slate-100 mt-auto">
                                        <p className="text-xs text-slate-500 mb-1">Asking Price</p>
                                        <p className="text-2xl font-extrabold text-slate-900 flex items-center gap-1">
                                            {formatCurrency(listing.listedPriceInPaise)}
                                        </p>
                                    </div>
                                </CardContent>
                                
                                <CardFooter className="p-5 pt-0">
                                    <Button asChild className="w-full relative overflow-hidden group/btn">
                                        <Link href={`/dashboard/marketplace/${listing.id}`}>
                                            <span className="relative z-10 flex items-center gap-2">
                                                View Details & Pitch Offer
                                            </span>
                                        </Link>
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
