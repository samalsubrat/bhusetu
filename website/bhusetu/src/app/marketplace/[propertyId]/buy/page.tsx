"use client"

import React from "react"
import { Footer } from "@/components/footer"
import MaxWidthWrapper from "@/components/MaxWidthWrapper"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import {
    ArrowRight,
    MapPin,
    ChevronRight,
    User,
    Phone,
    Home,
    IndianRupee,
    Shield,
    LayoutGrid,
} from "lucide-react"

const page = ({ params }: { params: Promise<{ propertyId: string }> }) => {
    const { propertyId } = React.use(params)

    return (
        <>
            <Navbar />
            <MaxWidthWrapper className="py-8 mt-4">

                {/* Breadcrumb */}
                <nav className="flex items-center gap-2 text-sm text-slate-500 mb-8">
                    <a className="hover:text-primary" href="#">National Registry</a>
                    <ChevronRight className="w-3 h-3" />
                    <a className="hover:text-primary" href="#">Karnataka State</a>
                    <ChevronRight className="w-3 h-3" />
                    <Link className="hover:text-primary" href={`/marketplace/${propertyId}`}>{propertyId}</Link>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 font-medium">Buy Request</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* ── Left: Property summary (col-span-4) ── */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
                            <div className="aspect-4/3 relative">
                                <img
                                    src="/images/property_front.jpg"
                                    alt="Property"
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-4 left-4">
                                    <span className="bg-primary/90 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                        Active Listing
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="mb-6">
                                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">Property BhuID</p>
                                    <h3 className="text-2xl font-black text-slate-900">{propertyId}</h3>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="w-[18px] h-[18px] text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Location</p>
                                            <p className="text-sm font-medium text-slate-800">Plot 42, Green Valley Residency, Sector 4, Bangalore East</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <LayoutGrid className="w-[18px] h-[18px] text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Area</p>
                                            <p className="text-sm font-medium text-slate-800">4,500 sq.ft. (Residential R-1)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <IndianRupee className="w-[18px] h-[18px] text-primary shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Estimated Valuation</p>
                                            <p className="text-sm font-bold text-slate-900">₹2,45,00,000</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                        <Shield className="w-[18px] h-[18px]" />
                                    </div>
                                    <p className="text-xs text-slate-500 italic leading-snug">
                                        Verification of your digital identity is required before the offer is written to the blockchain ledger.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Right: Form (col-span-8) ── */}
                    <div className="lg:col-span-8">
                        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200">
                            <div className="mb-8">
                                <h2 className="text-2xl font-bold text-slate-900">Make an Offer</h2>
                                <p className="text-slate-500 mt-1">Submit your purchase proposal directly to the property&apos;s smart contract.</p>
                            </div>

                            <form className="space-y-6">

                                {/* Name + Phone */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            Full Name (as per Aadhar/PAN)
                                        </label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-primary pointer-events-none" />
                                            <Input type="text" placeholder="e.g. Arjun Kumar Sharma" className="pl-10" />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                            Phone Number
                                        </label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-primary pointer-events-none" />
                                            <Input type="tel" placeholder="+91 98765 43210" className="pl-10" />
                                        </div>
                                    </div>
                                </div>

                                {/* Address */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        Current Residential Address
                                    </label>
                                    <div className="relative">
                                        <Home className="absolute left-3 top-3 w-[18px] h-[18px] text-primary pointer-events-none" />
                                        <Textarea rows={2} placeholder="Enter your current legal residence" className="pl-10 resize-none" />
                                    </div>
                                </div>

                                {/* Offer Price — featured block */}
                                <div className="p-6 bg-primary/5 rounded-xl border border-primary/20 space-y-4">
                                    <label className="text-sm font-bold text-primary uppercase tracking-widest block text-center">
                                        Your Offer Price
                                    </label>
                                    <div className="relative max-w-sm mx-auto">
                                        <span className="absolute inset-y-0 left-4 flex items-center text-2xl font-bold text-primary pointer-events-none select-none">
                                            ₹
                                        </span>
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            min={0}
                                            className="w-full pl-10 pr-4 py-4 bg-white border-2 border-primary/30 rounded-xl text-3xl font-black text-slate-900 text-center focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-slate-300"
                                        />
                                    </div>
                                    <p className="text-[11px] text-center text-slate-500">
                                        Your offer will be time-stamped and recorded on the BhuSetu Mainnet.
                                    </p>
                                </div>

                                {/* Message */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                        Justification / Message to Seller
                                    </label>
                                    <Textarea
                                        rows={4}
                                        placeholder="Briefly describe your interest or terms (e.g., payment timeline, financing status)"
                                        className="resize-none"
                                    />
                                </div>

                                {/* Terms */}
                                <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
                                    <Checkbox id="terms" className="mt-1 cursor-pointer" />
                                    <label htmlFor="terms" className="text-xs text-slate-600 leading-relaxed cursor-pointer">
                                        I understand that this offer, once submitted, is a formal expression of interest and will be stored on the BhuSetu blockchain ledger for auditability by the Department of Land Records.
                                    </label>
                                </div>

                                {/* Submit */}
                                <Button asChild className="group w-full h-12 text-base rounded-xl shadow-xl shadow-primary/20 gap-3">
                                    <Link href={`/marketplace/${propertyId}/success`}>
                                        Submit Offer
                                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                                    </Link>
                                </Button>

                            
                            </form>
                        </div>
                    </div>

                </div>
            </MaxWidthWrapper>
            <Footer />
        </>
    )
}

export default page
