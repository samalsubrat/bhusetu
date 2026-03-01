
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  IndianRupee,
  Ruler,
  ShieldCheck,
  SlidersHorizontal,
  FileText,
  ScrollText,
} from "lucide-react";
import { Footer } from "@/components/footer";
import MaxWidthWrapper from "@/components/MaxWidthWrapper";
import { properties } from "@/lib/property-data";

export default function MarketplacePage() {
    return (
        <>
            <Navbar />
            <MaxWidthWrapper>
            <main className="flex-1 py-8">
                {/* Header Title Section */}
                <div className="mb-8 mt-4">
                    <h1 className="text-slate-900 text-4xl font-black tracking-tight mb-2">Property Marketplace</h1>
                    <p className="text-slate-500 text-lg">
                        Secure, blockchain-verified national land registry. Every transaction is transparent, immutable, and government-approved.
                    </p>
                </div>

                {/* Filters Section */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-10 flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-50">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Location</label>
                        <button className="w-full flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <MapPin className="size-4 text-primary" />
                                <span>Delhi NCR, India</span>
                            </div>
                            <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 min-w-50">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Price Range</label>
                        <button className="w-full flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <IndianRupee className="size-4 text-primary" />
                                <span>₹50L - ₹2.5Cr</span>
                            </div>
                            <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 min-w-50">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Area Size</label>
                        <button className="w-full flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <Ruler className="size-4 text-primary" />
                                <span>1,000+ sq.ft</span>
                            </div>
                            <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <div className="flex-1 min-w-37.5">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Status</label>
                        <button className="w-full flex items-center justify-between bg-slate-50 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="size-4 text-primary" />
                                <span>Available</span>
                            </div>
                            <svg className="size-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                    </div>
                    <div className="flex items-end pt-5">
                        <Button className="h-10.5 px-6 font-bold flex items-center gap-2 shadow-md">
                            <SlidersHorizontal className="size-4" />
                            Filter
                        </Button>
                    </div>
                </div>

                {/* Properties Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {properties.map((property) => {
                        const cleanId = property.id.replace(/^#/, "");
                        return (
                            <a
                                key={property.id}
                                href={`/marketplace/${cleanId}`}
                                className="block group"
                                tabIndex={0}
                                aria-label={`View details for ${property.title}`}
                            >
                                <div className="bg-white rounded-xl overflow-hidden border border-slate-200 group-hover:shadow-xl transition-all duration-300 cursor-pointer">
                                    {/* Image */}
                                    <div className="relative aspect-video overflow-hidden">
                                        <div className="absolute top-3 right-3 z-10">
                                            <div className="bg-white/95 backdrop-blur px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-primary/20 shadow-sm">
                                                <ShieldCheck className="size-4 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Blockchain Verified</span>
                                            </div>
                                        </div>
                                        <Image
                                            src={property.image}
                                            alt={property.alt}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded">
                                                    {property.id}
                                                </span>
                                                <h3 className="text-slate-900 font-bold text-lg mt-1 group-hover:text-primary transition-colors leading-tight">
                                                    {property.title}
                                                </h3>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-primary text-xl font-black">{property.price}</p>
                                                <p className="text-slate-400 text-xs font-medium italic">Estimated Value</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 py-3 border-y border-slate-100 mb-4">
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <Ruler className="size-4" />
                                                <span className="text-sm font-medium">{property.area}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-500">
                                                <property.typeIcon className="size-4" />
                                                <span className="text-sm font-medium">{property.type}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <ScrollText className="size-4" />
                                                <span className="text-sm font-medium">{property.status}</span>
                                            </div>
                                        </div>

                                        <div className="w-full bg-slate-100 hover:bg-primary hover:text-white text-slate-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group-hover:bg-primary group-hover:text-white">
                                            <FileText className="size-5" />
                                            View Ledger Details
                                        </div>
                                    </div>
                                </div>
                            </a>
                        );
                    })}
                </div>

                {/* Load More Section */}
                <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-slate-500 text-sm">Showing 6 of 2,451 blockchain-verified properties</p>
                    <Button variant="outline" className="px-8 py-3 font-bold">
                        Load More Entries
                    </Button>
                </div>
            </main>
            </MaxWidthWrapper>
            <Footer/>
        </>
    )
}