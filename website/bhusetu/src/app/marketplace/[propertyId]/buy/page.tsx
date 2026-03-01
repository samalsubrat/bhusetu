import { Footer } from "@/components/footer"
import MaxWidthWrapper from "@/components/MaxWidthWrapper"
import Navbar from "@/components/Navbar"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { FileText, CreditCard, Upload, Info, ArrowRight, MapPin, Shield, Check, ChevronRight, ShieldCheck, RefreshCw, Delete, Trash, Trash2 } from "lucide-react"
import Image from "next/image"
// using standard img here to avoid next/image layout issues in this card


const page = ({ params }: { params: { propertyId: string } }) => {
    const { propertyId } = params;
    return (
        <>
            <Navbar />
            <MaxWidthWrapper className="py-8 mt-4">
                <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <a className="hover:text-primary" href="#">National Registry</a>
                    <ChevronRight className="w-3 h-3" />
                    <a className="hover:text-primary" href="#">Karnataka State</a>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 dark:text-slate-100 font-medium"> BhuID-8829-XQ</span>
                </nav>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                        Document Upload
                    </h1>
                    <p className="text-slate-500 mt-2">
                        Please upload all the mandatory legal documents required for the property registration process. All files will be encrypted and hased on the BhuSetu blockchain for immutable record-keeping.
                    </p>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4">

                    {/* left side  */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* cards  */}
                        <div className="grid grid-cols-1 gap-4 p-4 border-2 border-slate-200 bg-white rounded-2xl">
                            {/* Digilocker  */}
                            <div className="relative p-4 rounded-xl border-4 border-blue-400 bg-white flex flex-col gap-3">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="size-12 rounded-xl bg-[#2E7D32] flex items-center justify-center shrink-0">
                                            <MapPin className="size-5 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">Quick Fetch with DigiLocker</h3>
                                            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Directly link Aadhaar, PAN, and Land Records</p>
                                        </div>
                                    </div>
                                    <Button className=" hover:bg-blue-800 cursor-pointer text-white shrink-0 gap-2 whitespace-nowrap">
                                        <RefreshCw className="size-4" />
                                        Verify with DigiLocker
                                    </Button>
                                </div>
                                <div className="flex items-start gap-2 px-1">
                                    <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                                    <p className="text-sm text-gray-500"><span className="font-bold text-slate-900">Why use DigiLocker?</span> Retrieval is 80% faster and documents come <span className="text-primary font-bold">pre-verified</span> for immediate blockchain submission, bypassing manual inspection delays.</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 p-2">
                                <div className="h-px flex-1 bg-gray-300" />
                                <div className="shrink-0 text-sm text-gray-400 font-bold tracking-widest">OR MANUALLY UPLOAD</div>
                                <div className="h-px flex-1 bg-gray-300" />
                            </div>

                            {/* Sale Deed */}
                            <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <FileText className="size-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Sale Deed</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Mandatory legal document for land registration.</p>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <FileText className="size-4 text-blue-600 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 truncate">Sale_Deed_v1.pdf</span>
                                        </div>
                                        <Trash2 className="size-4 text-red-500" />
                                    </div>
                                    <p className="text-xs font-bold text-green-600 mt-2 uppercase tracking-wider">Uploaded</p>
                                </div>
                            </div>

                            {/* Tax Receipts */}
                            <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                        <CreditCard className="size-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">Tax Receipts</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Upload latest property tax clearance receipts.</p>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                        <Upload className="size-4 text-slate-400" />
                                        <span className="text-sm text-slate-500 font-medium">Upload File</span>
                                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                                    </label>
                                    <p className="text-xs font-bold text-amber-500 mt-2 uppercase tracking-wider">Pending</p>
                                </div>
                            </div>

                            {/* Identity Proof */}
                            <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                                <div className="flex items-center gap-4" >
                                    <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                        <CreditCard className="size-6" />
                                    </div>

                                    <div>
                                        <h3 className="font-bold text-slate-900">Aadhar Card</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">Government issued ID for Identity Proof.</p>
                                    </div>
                                </div>
                                <div className="mt-auto">
                                    <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="size-4 text-blue-600 shrink-0" />
                                            <span className="text-xs font-medium text-slate-700 truncate">ID_Proof_Aadhar.jpg</span>
                                        </div>
                                        <Trash2 className="size-4 text-red-500" />
                                    </div>
                                    <p className="text-xs font-bold text-green-600 mt-2 uppercase tracking-wider">Uploaded</p>
                                </div>
                            </div>


                            <div className="flex items-center gap-2 justify-center">
                                <Info className="size-4 text-blue-600" />
                                <p className="text-sm text-gray-500">Ensure all documents are clear and legible. Documents will be verified by the District Registrar's office.</p>
                            </div>
                        </div>

                    </div>

                    <div className="lg:col-span-1 space-y-4">

                        <div className="bg-white border border-gray-300 rounded-lg shadow-sm">
                            <div className="w-full aspect-video overflow-hidden rounded-tl-md rounded-tr-md relative">
                                <img
                                    src="/images/property_front.jpg"
                                    alt="property"
                                    className="w-full h-full object-cover block"
                                />
                                <div className="bg-primary p-2 absolute bottom-2 left-2 rounded-md text-white text-xs font-bold shadow-lg">BHU-9928-X</div>
                            </div>


                            <div className="p-4">
                                <div className="font-bold">BHU-9928-X</div>
                                <div className="flex items-center gap-1 text-slate-600 mt-1">
                                    <MapPin className="size-3 text-slate-500" />
                                    <p className="text-xs font-medium">Plot 42, Green Valley Residency, Sector 4, Bangalore East</p>
                                </div>
                                <div className="flex gap-2 items-center py-4">
                                    <div className="p-2 rounded-md bg-background w-full">
                                        <p className="text-xs text-gray-500 font-bold">TOTAL AREA</p>
                                        <p className="text-lg text-black font-bold">2,500 sq.ft</p>
                                    </div>
                                    <div className="p-2 rounded-md bg-background w-full">
                                        <p className="text-xs text-gray-500 font-bold">PRICE</p>
                                        <p className="text-lg text-black font-bold">₹ 1.25 CR</p>
                                    </div>
                                </div>
                                <div className="h-px w-full bg-gray-300" />

                                <div className="space-y-2 mt-4">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500">Seller</p>
                                        <p className="text-sm font-bold text-black">Shashwat Sahoo</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500">Registry Office</p>
                                        <p className="text-sm font-bold text-black">Khandagiri</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm text-gray-500">Status</p>
                                        <p className="text-sm font-bold text-saffron">Uploading Documents</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-500/10 rounded-xl p-4 border border-green-600/20">
                            <div className="flex items-center gap-3">
                                <Shield className="size-4 text-green-600 shrink-0" />
                                <div>
                                    <h5 className="text-sm font-bold text-black">Encryption Standard</h5>
                                </div>
                            </div>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed flex items-center gap-2 font-semibold">
                                <Check className="size-4 text-green-600" /> AES-256 Bit Data Encryption
                            </p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed flex items-center gap-2 font-semibold">
                                <Check className="size-4 text-green-600" /> IPFS Immutable Storage Hash
                            </p>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed flex items-center gap-2 font-semibold">
                                <Check className="size-4 text-green-600" /> Digital Signature Verification
                            </p>
                        </div>


                        {/* submit button  */}
                        <Button asChild className="group w-full h-12">
                            <Link href={`/marketplace/${propertyId}/success`}>
                                Submit Documents
                                <ArrowRight className="-ml-1 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </Button>

                        {/* Need Assistance  */}
                        <div className="bg-slate-900 text-white rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                            <h3 className="font-bold relative z-10">Need Assistance?</h3>
                            <p className="text-xs text-slate-400 mt-2 relative z-10">
                                Contact the district registrar office for documentation queries.
                            </p>
                            <button className="mt-4 flex items-center gap-2 text-sm font-bold text-primary relative z-10 group">
                                Live Support
                                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>
                    </div>
                </div>
            </MaxWidthWrapper>
            <Footer />
        </>
    )
}

export default page