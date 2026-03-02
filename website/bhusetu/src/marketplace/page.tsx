import Image from "next/image"
import Header from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import {
    MapPin,
    IndianRupee,
    Ruler,
    ShieldCheck,
    SlidersHorizontal,
    FileText,
    Home,
    Building2,
    LandPlot,
    Landmark,
    ScrollText,
} from "lucide-react"
import { Footer } from "@/components/footer"

const properties = [
    {
        id: "#BHU-9928-X",
        title: "Sector 62, Noida Urban",
        price: "₹1.25 Cr",
        area: "1,250 sq.ft",
        type: "Residential",
        typeIcon: Building2,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDASUkjc6R5L3aUNdswemylq3mRjXEU4qyX2OSdjjlB9_wkc9EdLMcMetdGSkDNEfUQqZEZp88HqeZJr_1f2Etgi6zsBbt27rTOTbcmhX0acPeToJDYjttYHPlgrbV7s5e8Ywc7I_WaNiKFK63Ot89Q-kOW3y5re4w1cnqCpVqHTK6Eo244blEjSzt_PPKQvFoEvySBnoZVsQ9ACJ5Jt3KcFKQgE9P75Pkl9L9dhWhwaLUNtsTxkqXrz5reQQIic3XSosb15fOC",
        alt: "Modern high-rise apartment building in Noida Sector 62",
    },
    {
        id: "#BHU-4412-Z",
        title: "Whitefield, Bangalore East",
        price: "₹3.80 Cr",
        area: "2,800 sq.ft",
        type: "Villa",
        typeIcon: Home,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDeXWJUrB5iCDTyqACqFZ31PloVdfyLMjjOURZ7HiiH5-V5EPsPjFYi9QCXdjqSK5d42go21oFX4-xo1xDJpxvta3MbjdqK9MjFSHgVkUJiMDFskOxZE67AzTp5UpfNFZ9bgc0wvSQGCg4ZVJ8gpQirFHR5IK7fV0pqjOLQlr_YC-ABS99obec8-nCotl5RKZQf5jkJWUZ-MqsVpWsV2afvctkjE2jKJPyLyELTDwlrIIfJn0BlwImRF37vKot90NeGCfA_ui7N",
        alt: "Luxury villa with pool in Whitefield Bangalore",
    },
    {
        id: "#BHU-1029-A",
        title: "New Town, Kolkata Hub",
        price: "₹92.0 L",
        area: "950 sq.ft",
        type: "Open Plot",
        typeIcon: LandPlot,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBSGbPiJLrkaYPj4Iglx59TBiHvcxF-YZX7PpsL5cEIrX9SHmDLK6IQ8hUvX8auXudwDwF5lq8imwdqhIbZxrBgNdEYWj0mrxp_InBCRRMdUQYxelkoDZewybVCUtU7pxGx25zQnWoVJremXISGBwkcqPtEzkCfMIMdS46MISeuTh_IrP1mzosNQ5hFb4GJ3XweXy5uqim4LIsgGL5QV3if6vOtLnwFfp2vxd-X0_e2dLF2feOmqYUHzFBiW8XiZ4lqQXgs2NKI",
        alt: "Satellite map view of a plot in New Town Kolkata",
    },
    {
        id: "#BHU-8872-B",
        title: "HITEC City, Hyderabad",
        price: "₹2.45 Cr",
        area: "1,850 sq.ft",
        type: "Commercial",
        typeIcon: Building2,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC7HuiUNU90Fa6XsNbjXNAZRPIBQ3oCmjM8jF6jAZV1QWPK_K7UQ06pafh_kZib6nbCLSpesrwsUu0mlpoCmQAfXyCGq8LN6PxP2xOHB4qHmsLLRl4HzJ0N_a3b9bLjip0-mWV3f4V8dECIT-nMqVrIIBLqntiyy3ixMTyaUuYP4GUxcDGo3KykovW9ak50LE-PYZvo4T-ZUD3SaNqYzSZ3rl2u6fIRdh5ZbmY0CA92gJtY0UI2a615y9AhO3O1Vo4xiNLuwjES",
        alt: "Corporate office space in HITEC City Hyderabad",
    },
    {
        id: "#BHU-3341-M",
        title: "Baner, West Pune",
        price: "₹1.85 Cr",
        area: "1,400 sq.ft",
        type: "Apartment",
        typeIcon: Building2,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDIr2dbhGCCPzbF1oO6jsNjXYb-BtxLRmlw6I_p_6zb7Ld_xkcQQ1sdpOaxi4BbDAiwLKMBY1c8G8YuiBC491ER3cRRGNMhbSxtBUUxYcrpbH6acHkz3qh82swv-aylcAAfdMgt-yx6UoyYlbi8Ztaqt-V0tcp4YbWfASIajxoxoQk1wnBJJ5937C_vvDwp5xUy0hE4OXcXcdcqmq2n3IHpiYclDMDNQnz8Ny7Yg4GlJCvVKuFGARJbTAqIfw3EzpdsalaNUxy_",
        alt: "Residential apartment interior in Pune",
    },
    {
        id: "#BHU-5521-K",
        title: "Gomti Nagar, Lucknow",
        price: "₹98.5 L",
        area: "1,100 sq.ft",
        type: "Row House",
        typeIcon: Home,
        status: "Clean Title",
        image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCIZIWdkc3NwCorpMOzyyKYG9tN2-N6TZsoGbPvi8AGskxjbLomQffBif8VmtuTOHDeOiE9SiDKvyXiskZMQrQCdkWIWTSggvG0HgSgJc8Gat8upolj0hhEwY40BuPzmJTtSARnuS6lfmUJFE3mBs6kHtF3us4qgtnSyUj3hLoa3CXSA0IAqgUyfo6iiCC7pFghZrgjEUGi6CeldNJGfcjMnWFTwZ8n8HZLZQiCrIykUsk7AbAXQOI_O0nVFAlYpS3iUqDS_KgQ",
        alt: "Residential row house in Lucknow Gomti Nagar",
    },
]

export default function MarketplacePage() {
    return (
        <>
            <Header />
            <main className="flex-1 py-8 px-6 md:px-10 lg:px-20 max-w-360 mx-auto w-full">
                {/* Header Title Section */}
                <div className="mb-8">
                    <h1 className="text-slate-900 text-4xl font-black tracking-tight mb-2">Property Marketplace</h1>
                    <p className="text-slate-500 text-lg max-w-2xl">
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
                    {properties.map((property) => (
                        <div
                            key={property.id}
                            className="bg-white rounded-xl overflow-hidden border border-slate-200 group hover:shadow-xl transition-all duration-300"
                        >
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

                                <button className="w-full bg-slate-100 hover:bg-primary hover:text-white text-slate-900 font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2">
                                    <FileText className="size-5" />
                                    View Ledger Details
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Load More Section */}
                <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-slate-500 text-sm">Showing 6 of 2,451 blockchain-verified properties</p>
                    <Button variant="outline" className="px-8 py-3 font-bold">
                        Load More Entries
                    </Button>
                </div>
            </main>
            <Footer/>
        </>
    )
}