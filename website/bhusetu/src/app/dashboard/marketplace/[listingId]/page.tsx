"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Loader2,
    ChevronLeft,
    MapPin,
    IndianRupee,
    User,
    Building2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    MessageSquare,
    Clock,
    Trash2,
    Mail,
    Phone
} from "lucide-react"

// Types
interface OfferUser {
    id: string
    name: string
    email: string
}

interface Offer {
    id: string
    listingId: string
    offerByUserId: string
    amountInPaise: string
    message: string | null
    status: "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN"
    createdAt: string
    offerByUser?: OfferUser
}

interface ListingDetail {
    id: string
    title: string
    description: string | null
    listedPriceInPaise: string
    contactEmail: string | null
    contactPhone: string | null
    isActive: boolean
    listedAt: string
    registration: {
        id: string
        bhuSetuId: string | null
        ownerName: string
        category: string
        district: string
        state: string
        tehsil: string
        plotNumber: string
        landArea: number
        pincode: string
        northBoundary: string
        southBoundary: string
        eastBoundary: string
        westBoundary: string
    }
    listedByUser: {
        id: string
        name: string
    }
    offers: Offer[]
}

export default function ListingDetailPage({
    params,
}: {
    params: Promise<{ listingId: string }>
}) {
    const { listingId } = use(params)
    const router = useRouter()
    
    const [listing, setListing] = useState<ListingDetail | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    
    // Offer Dialog State
    const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false)
    const [offerAmount, setOfferAmount] = useState("")
    const [offerMessage, setOfferMessage] = useState("")
    const [submittingOffer, setSubmittingOffer] = useState(false)
    
    // Action State
    const [processingAction, setProcessingAction] = useState<string | null>(null)

    const fetchListing = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/marketplace/${listingId}`)
            if (!res.ok) {
                if (res.status === 404) throw new Error("Listing not found")
                throw new Error("Failed to load listing details")
            }
            const data = await res.json()
            setListing(data.listing)
            setIsOwner(data.isOwner)
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchListing()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [listingId])

    const formatCurrency = (paise: string | number) => {
        const rupees = Number(paise) / 100
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(rupees)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    // Handlers
    const handleSubmitOffer = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!offerAmount) return

        try {
            setSubmittingOffer(true)
            const res = await fetch(`/api/marketplace/${listingId}/offers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amountInRupees: Number(offerAmount),
                    message: offerMessage
                })
            })
            
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Failed to submit offer")
            
            setIsOfferDialogOpen(false)
            setOfferAmount("")
            setOfferMessage("")
            fetchListing() // refresh data
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to submit offer")
        } finally {
            setSubmittingOffer(false)
        }
    }

    const handleOfferAction = async (offerId: string, action: "ACCEPT" | "REJECT" | "WITHDRAW") => {
        if (!confirm(`Are you sure you want to ${action.toLowerCase()} this offer?`)) return
        
        try {
            setProcessingAction(offerId)
            const res = await fetch(`/api/marketplace/${listingId}/offers/${offerId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action })
            })
            
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || `Failed to ${action.toLowerCase()} offer`)
            
            fetchListing() // refresh data
        } catch (err) {
            alert(err instanceof Error ? err.message : "Action failed")
        } finally {
            setProcessingAction(null)
        }
    }

    const handleDelist = async () => {
        if (!confirm("Are you sure you want to remove this property from the marketplace? Active offers will be cancelled.")) return
        
        try {
            setProcessingAction("delist")
            const res = await fetch(`/api/marketplace/${listingId}`, {
                method: "DELETE"
            })
            
            if (!res.ok) throw new Error("Failed to delist property")
            
            router.push("/dashboard/marketplace")
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to delist property")
            setProcessingAction(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="size-8 animate-spin text-primary" />
            </div>
        )
    }

    if (error || !listing) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
                <AlertCircle className="size-12 text-red-500" />
                <h2 className="text-xl font-bold text-slate-900">{error || "Listing not found"}</h2>
                <Button variant="outline" onClick={() => router.push("/dashboard/marketplace")}>
                    Back to Marketplace
                </Button>
            </div>
        )
    }

    const reg = listing.registration
    const hasPendingOffer = !isOwner && listing.offers.some(o => o.status === "PENDING")

    return (
        <div className="p-6 sm:p-10 mx-auto max-w-5xl space-y-8">
            {/* Header / Back */}
            <div>
                <button
                    onClick={() => router.push("/dashboard/marketplace")}
                    className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition-colors font-medium"
                >
                    <ChevronLeft className="size-4" />
                    Back to Marketplace
                </button>
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                                {listing.title}
                            </h1>
                            {!listing.isActive && (
                                <Badge variant="destructive" className="font-bold">INACTIVE</Badge>
                            )}
                        </div>
                        <p className="flex items-center gap-2 text-slate-500">
                            <MapPin className="size-4" />
                            {reg.tehsil}, {reg.district}, {reg.state} - {reg.pincode}
                        </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 bg-slate-50 border border-slate-100 p-4 rounded-xl shrink-0">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Asking Price</span>
                        <span className="text-3xl font-black text-slate-900">
                            {formatCurrency(listing.listedPriceInPaise)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Grid Layout taking 2/3 - 1/3 layout on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Left Column: Property Details (spanning 2 cols) */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Description */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <MessageSquare className="size-5 text-slate-400" />
                                Listing Description
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                                {listing.description || "No description provided by the owner."}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Property Details */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="size-5 text-slate-400" />
                                Property Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">BHU Property ID</p>
                                    <p className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded inline-block">
                                        {reg.bhuSetuId}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Category</p>
                                    <p className="font-medium text-slate-900">{reg.category}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Land Area</p>
                                    <p className="font-medium text-slate-900">{reg.landArea.toLocaleString()} sq.ft</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Plot Number</p>
                                    <p className="font-medium text-slate-900">{reg.plotNumber}</p>
                                </div>
                            </div>
                            
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Boundaries</p>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">North</p>
                                        <p className="text-sm font-medium text-slate-700">{reg.northBoundary}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">South</p>
                                        <p className="text-sm font-medium text-slate-700">{reg.southBoundary}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">East</p>
                                        <p className="text-sm font-medium text-slate-700">{reg.eastBoundary}</p>
                                    </div>
                                    <div className="bg-slate-50 p-2.5 rounded border border-slate-100 text-center">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">West</p>
                                        <p className="text-sm font-medium text-slate-700">{reg.westBoundary}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                
                {/* Right Column: Actions, Seller Info, Offers List */}
                <div className="space-y-6">
                    
                    {/* Action Card */}
                    {listing.isActive && (
                        <Card className={isOwner ? "border-slate-200" : "border-primary bg-primary/5"}>
                            <CardContent className="p-6">
                                {isOwner ? (
                                    <div className="space-y-4 text-center">
                                        <div className="inline-flex items-center justify-center size-12 rounded-full bg-blue-100 mb-2">
                                            <User className="size-6 text-blue-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Your Listing</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Review incoming offers below.
                                            </p>
                                        </div>
                                        <Button 
                                            variant="destructive" 
                                            className="w-full gap-2 mt-2"
                                            onClick={handleDelist}
                                            disabled={processingAction === "delist"}
                                        >
                                            {processingAction === "delist" ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                                            Remove Listing
                                        </Button>
                                    </div>
                                ) : hasPendingOffer ? (
                                    <div className="text-center space-y-4">
                                        <div className="inline-flex items-center justify-center size-12 rounded-full bg-green-100 mb-2">
                                            <CheckCircle2 className="size-6 text-green-600" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Offer Pending</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                You have already submitted an active offer for this property. Wait for the owner&apos;s response.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg">Interested?</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                Submit an offer directly to the property owner.
                                            </p>
                                        </div>
                                        
                                        <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
                                            <DialogTrigger asChild>
                                                <Button size="lg" className="w-full font-bold text-md">
                                                    Make an Offer
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="sm:max-w-[425px]">
                                                <DialogHeader>
                                                    <DialogTitle>Pitch your Offer</DialogTitle>
                                                    <DialogDescription>
                                                        Submit a binding offer for <strong>{listing.title}</strong> to the owner.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <form onSubmit={handleSubmitOffer}>
                                                    <div className="grid gap-4 py-4">
                                                        <div className="space-y-2">
                                                            <label htmlFor="amount" className="text-sm font-semibold">
                                                                Offer Amount (₹)
                                                            </label>
                                                            <div className="relative">
                                                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                                                                <Input
                                                                    id="amount"
                                                                    type="number"
                                                                    min={0}
                                                                    className="pl-9"
                                                                    placeholder="e.g. 5000000"
                                                                    value={offerAmount}
                                                                    onChange={(e) => setOfferAmount(e.target.value)}
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label htmlFor="message" className="text-sm font-semibold">
                                                                Message to Owner (Optional)
                                                            </label>
                                                            <Textarea
                                                                id="message"
                                                                placeholder="Introduce yourself or detail terms..."
                                                                className="resize-none"
                                                                value={offerMessage}
                                                                onChange={(e) => setOfferMessage(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <DialogFooter>
                                                        <Button type="button" variant="outline" onClick={() => setIsOfferDialogOpen(false)}>
                                                            Cancel
                                                        </Button>
                                                        <Button type="submit" disabled={submittingOffer}>
                                                            {submittingOffer && <Loader2 className="size-4 animate-spin mr-2" />}
                                                            Submit Offer
                                                        </Button>
                                                    </DialogFooter>
                                                </form>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Seller Profile */}
                    <Card>
                        <CardHeader className="pb-4">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                Seller Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="font-bold text-slate-900 flex items-center gap-2 mb-4">
                                <User className="size-4 text-slate-400" />
                                {listing.listedByUser.name}
                            </p>
                            {(listing.contactEmail || listing.contactPhone) && (
                                <div className="space-y-2 pt-4 border-t border-slate-100">
                                    {listing.contactEmail && (
                                        <p className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail className="size-4 shrink-0 text-slate-400" />
                                            {listing.contactEmail}
                                        </p>
                                    )}
                                    {listing.contactPhone && (
                                        <p className="flex items-center gap-2 text-sm text-slate-600">
                                            <Phone className="size-4 shrink-0 text-slate-400" />
                                            {listing.contactPhone}
                                        </p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Offers List */}
                    <Card>
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">
                                {isOwner ? `Incoming Offers (${listing.offers.length})` : "Your Offers"}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {listing.offers.length === 0 ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-slate-500 italic">No offers to display.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                                    {listing.offers.map(offer => (
                                        <div key={offer.id} className="p-4 space-y-3">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-bold text-lg text-slate-900 group-hover:text-primary transition-colors">
                                                        {formatCurrency(offer.amountInPaise)}
                                                    </p>
                                                    {isOwner && offer.offerByUser && (
                                                        <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                            from {offer.offerByUser.name}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge 
                                                    variant="secondary"
                                                    className={`
                                                        ${offer.status === "PENDING" ? "bg-blue-50 text-blue-700" : ""}
                                                        ${offer.status === "ACCEPTED" ? "bg-emerald-50 text-emerald-700 font-bold border border-emerald-200" : ""}
                                                        ${offer.status === "REJECTED" ? "bg-red-50 text-red-700" : ""}
                                                        ${offer.status === "WITHDRAWN" ? "bg-slate-100 text-slate-600" : ""}
                                                    `}
                                                >
                                                    {offer.status}
                                                </Badge>
                                            </div>
                                            
                                            {offer.message && (
                                                <div className="bg-slate-50 p-2.5 rounded text-sm text-slate-600 italic border border-slate-100">
                                                    &quot;{offer.message}&quot;
                                                </div>
                                            )}
                                            
                                            <div className="flex items-center justify-between mt-2 pt-2">
                                                <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
                                                    <Clock className="size-3" />
                                                    {formatDate(offer.createdAt)}
                                                </span>
                                                
                                                {/* Actions based on role and status */}
                                                {offer.status === "PENDING" && (
                                                    <div className="flex gap-2">
                                                        {isOwner ? (
                                                            <>
                                                                <Button 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                                                    disabled={processingAction === offer.id}
                                                                    onClick={() => handleOfferAction(offer.id, "REJECT")}
                                                                >
                                                                    Reject
                                                                </Button>
                                                                <Button 
                                                                    size="sm" 
                                                                    className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                    disabled={processingAction === offer.id}
                                                                    onClick={() => handleOfferAction(offer.id, "ACCEPT")}
                                                                >
                                                                    Accept
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button 
                                                                size="sm" 
                                                                variant="outline" 
                                                                className="h-7 text-xs"
                                                                disabled={processingAction === offer.id}
                                                                onClick={() => handleOfferAction(offer.id, "WITHDRAW")}
                                                            >
                                                                Withdraw
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
