"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "../ui/button"
import { FileText, CreditCard, ChevronRight, ArrowRight, ChevronLeft, ShieldCheck, Loader2, ExternalLink, MapPin, User, Landmark, FileCheck } from "lucide-react"
import { useRegistration, type UploadedDocument } from "@/context/RegistrationContext"
import { calculateProcessingFee, calculateStampDuty } from "@/lib/registration-fees"
import RegistrationFeeSidebar from "@/components/dashboard/RegistrationFeeSidebar"

declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open: () => void }
    }
}



function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.getElementById('razorpay-script')) return resolve(true)
        const script = document.createElement('script')
        script.id = 'razorpay-script'
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}


const Review = () => {
    const router = useRouter()
    const [isPaying, setIsPaying] = useState(false)
    const [openingFile, setOpeningFile] = useState<string | null>(null)
    const { data: regData } = useRegistration()

    const landAreaNum = parseFloat(regData.landArea) || 0
    const taxPaid = regData.taxPaid === "Yes"
    const processingFee = calculateProcessingFee(landAreaNum, regData.category, taxPaid)
    const stampDuty = calculateStampDuty(regData.district)
    const totalAmount = processingFee + stampDuty

    const handlePreviousStep = () => {
        router.push('/dashboard/registration/documents')
    }

    const handleOpenFile = async (file: UploadedDocument) => {
        try {
            setOpeningFile(file.cid)
            const res = await fetch("/api/files/view", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: file.id,
                    cid: file.cid,
                    originalName: file.name,
                    mimeType: file.mimeType,
                }),
            })
            if (!res.ok) throw new Error("Failed to decrypt file")
            const blob = await res.blob()
            const blobUrl = URL.createObjectURL(blob)
            window.open(blobUrl, "_blank", "noopener,noreferrer")
        } catch (e) {
            console.error(e)
            alert("Failed to open file. Please try again.")
        } finally {
            setOpeningFile(null)
        }
    }

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes("pdf")) return <FileText className="size-4 text-red-500 shrink-0" />
        if (mimeType.includes("image")) return <CreditCard className="size-4 text-blue-500 shrink-0" />
        return <FileText className="size-4 text-primary shrink-0" />
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case "sale_deed": return "Sale Deed"
            case "tax_receipt": return "Tax Receipt"
            case "identity_proof": return "Identity Proof"
            default: return "Other Document"
        }
    }

    const handlePayment = async () => {
        setIsPaying(true)
        try {
            const loaded = await loadRazorpayScript()
            if (!loaded) {
                alert('Failed to load payment gateway. Please check your connection.')
                return
            }

            const orderRes = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: totalAmount, receipt: `bhusetu_${Date.now()}` }),
            })
            const { orderId, amount, currency } = await orderRes.json()

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount,
                currency,
                name: 'BhuSetu',
                description: 'Property Registration Fee',
                order_id: orderId,
                handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
                    const verifyRes = await fetch('/api/payment/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(response),
                    })
                    const data = await verifyRes.json()
                    if (data.success) {
                        router.push('/dashboard/registration/success')
                    } else {
                        alert('Payment verification failed. Please contact support.')
                    }
                },
                prefill: { name: regData.ownerName, email: '', contact: '' },
                theme: { color: '#2563eb' },
                modal: { ondismiss: () => setIsPaying(false) },
            }

            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (err) {
            console.error('Payment error:', err)
            alert('Something went wrong. Please try again.')
        } finally {
            setIsPaying(false)
        }
    }

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel – Review Content */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Owner & Property Details */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <User className="size-4 text-primary" />
                            <h2 className='text-black text-xs md:text-sm font-semibold'>OWNER & PROPERTY DETAILS</h2>
                        </div>
                        <div className='h-px bg-slate-200 mx-0' />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="Legal Owner Name" value={regData.ownerName} />
                            <ReviewField label="Land Area" value={regData.landArea ? `${regData.landArea} sqft` : ""} />
                            <ReviewField label="Latest Tax Paid" value={regData.taxPaid} />
                            <ReviewField label="Category / Type" value={regData.category} />
                        </div>
                    </section>

                    {/* Boundary Information */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <Landmark className="size-4 text-primary" />
                            <h2 className='text-black text-xs md:text-sm font-semibold'>BOUNDARY INFORMATION</h2>
                        </div>
                        <div className='h-px bg-slate-200 mx-0' />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="North Boundary" value={regData.northBoundary} />
                            <ReviewField label="South Boundary" value={regData.southBoundary} />
                            <ReviewField label="East Boundary" value={regData.eastBoundary} />
                            <ReviewField label="West Boundary" value={regData.westBoundary} />
                        </div>
                    </section>

                    {/* Location Information */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <MapPin className="size-4 text-primary" />
                            <h2 className='text-black text-xs md:text-sm font-semibold'>LOCATION INFORMATION</h2>
                        </div>
                        <div className='h-px bg-slate-200 mx-0' />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="PIN Code" value={regData.pincode} />
                            <ReviewField label="State" value={regData.state} />
                            <ReviewField label="District" value={regData.district} />
                            <ReviewField label="Post Office" value={regData.postOffice} />
                            <ReviewField label="Tehsil / Village" value={regData.tehsil} />
                            <ReviewField label="Plot Number" value={regData.plotNumber} />
                        </div>
                    </section>

                    {/* Uploaded Documents */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <FileCheck className="size-4 text-primary" />
                            <h2 className='text-black text-xs md:text-sm font-semibold'>UPLOADED DOCUMENTS ({regData.documents.length})</h2>
                        </div>
                        <div className='h-px bg-slate-200 mx-0' />
                        <div className="p-6">
                            {regData.documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {regData.documents.map((doc) => (
                                        <button
                                            key={doc.cid}
                                            onClick={() => handleOpenFile(doc)}
                                            className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/30 transition-colors group/file text-left cursor-pointer"
                                        >
                                            {getFileIcon(doc.mimeType)}
                                            <div className="min-w-0 flex-1">
                                                <span className="text-sm font-medium truncate block group-hover/file:text-primary transition-colors">
                                                    {doc.name}
                                                </span>
                                                <span className="text-xs text-slate-400">
                                                    {getCategoryLabel(doc.category)} · {formatFileSize(doc.size)}
                                                </span>
                                            </div>
                                            {openingFile === doc.cid ? (
                                                <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                                            ) : (
                                                <ExternalLink className="size-4 text-slate-300 group-hover/file:text-primary shrink-0 transition-colors" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">No documents uploaded.</p>
                            )}
                        </div>
                    </section>

                    {/* Fee Summary */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4">
                            <h2 className='text-black text-xs md:text-sm font-semibold'>FEE SUMMARY</h2>
                        </div>
                        <div className='h-px bg-slate-200 mx-0' />
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Processing Fee</span>
                                <span className="font-medium text-slate-900">₹{processingFee.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Stamp Duty ({regData.district || "N/A"})</span>
                                <span className="font-medium text-slate-900">₹{stampDuty.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="h-px bg-slate-200 my-2" />
                            <div className="flex justify-between text-base font-bold">
                                <span className="text-slate-900">Total Amount</span>
                                <span className="text-primary">₹{totalAmount.toLocaleString("en-IN")}</span>
                            </div>
                        </div>
                    </section>
                </div>


                {/* Right: Info Panel */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Blockchain Security */}
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-center gap-2 mb-4 text-primary">
                            <ShieldCheck className="size-5" />
                            <h3 className="font-bold">Blockchain Security</h3>
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            Data submitted here will be hashed and stored on the BhuSetu Private Blockchain.
                            Once confirmed, this record becomes{" "}
                            <span className="font-bold text-primary">immutable</span> and legally binding.
                        </p>
                        <div className="mt-6 p-3 bg-white rounded-lg flex items-center gap-3 shadow-sm">
                            <div className="size-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Network: Node-04 Active
                            </span>
                        </div>
                    </div>

                    {/* Review Checklist */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Review Checklist</h3>
                        <div className="space-y-2">
                            <ChecklistItem label="Owner details filled" checked={!!regData.ownerName && !!regData.landArea} />
                            <ChecklistItem label="Boundary details filled" checked={!!regData.northBoundary && !!regData.southBoundary && !!regData.eastBoundary && !!regData.westBoundary} />
                            <ChecklistItem label="Location verified" checked={!!regData.pincode && !!regData.state && !!regData.district} />
                            <ChecklistItem label="Sale Deed uploaded" checked={regData.documents.some(d => d.category === "sale_deed")} />
                            <ChecklistItem label="Tax Receipt uploaded" checked={regData.documents.some(d => d.category === "tax_receipt")} />
                            <ChecklistItem label="Identity Proof uploaded" checked={regData.documents.some(d => d.category === "identity_proof")} />
                        </div>
                    </div>

                    {/* Dynamic Registration Fee */}
                    <RegistrationFeeSidebar />

                    {/* Need Assistance */}
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

                    {/* Navigation Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                            <Button
                                variant="outline"
                                onClick={handlePreviousStep}
                                className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-500 gap-2"
                            >
                                <ChevronLeft className="size-4" />
                                Previous
                            </Button>
                            <Button
                                onClick={handlePayment}
                                disabled={isPaying}
                                className="hover:cursor-pointer w-full sm:w-auto px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/25 gap-2"
                            >
                                {isPaying ? 'Processing...' : 'Pay & Register'}
                                {isPaying ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}


// ─── Helper Components ───────────────────────────────────────────────

function ReviewField({ label, value }: { label: string; value: string }) {
    return (
        <div className="space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{label}</p>
            <p className={`text-sm font-medium ${value ? "text-slate-900" : "text-slate-300 italic"}`}>
                {value || "Not provided"}
            </p>
        </div>
    )
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className={`size-5 rounded-full flex items-center justify-center ${checked ? "bg-green-500" : "bg-slate-200"}`}>
                {checked ? (
                    <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ) : (
                    <div className="size-2 rounded-full bg-slate-400" />
                )}
            </div>
            <span className={`text-sm ${checked ? "text-green-700 font-medium" : "text-slate-500"}`}>
                {label}
            </span>
        </div>
    )
}

export default Review