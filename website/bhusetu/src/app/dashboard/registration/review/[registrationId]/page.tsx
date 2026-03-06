"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    FileText,
    CreditCard,
    ChevronRight,
    ArrowRight,
    ChevronLeft,
    ShieldCheck,
    Loader2,
    ExternalLink,
    MapPin,
    User,
    Landmark,
    FileCheck,
    AlertCircle,
    Timer,
} from "lucide-react"
import { formatCurrency } from "@/lib/registration-fees"

// ─── Types ───────────────────────────────────────────────────────────
interface UploadedDocument {
    id: string
    cid: string
    name: string
    size: number
    mimeType: string
    category: "sale_deed" | "tax_receipt" | "identity_proof" | "other"
}

interface RegistrationData {
    id: string
    regYear: number
    regNumber: number
    bhuSetuId: string | null
    status: string
    paymentDeadline: string | null
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
    documents: UploadedDocument[]
    processingFee: number
    stampDuty: number
    totalAmount: number
    createdAt: string
    updatedAt: string
}

declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open: () => void }
    }
}

function loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
        if (document.getElementById("razorpay-script")) return resolve(true)
        const script = document.createElement("script")
        script.id = "razorpay-script"
        script.src = "https://checkout.razorpay.com/v1/checkout.js"
        script.onload = () => resolve(true)
        script.onerror = () => resolve(false)
        document.body.appendChild(script)
    })
}

function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

// ─── Main Component ──────────────────────────────────────────────────
export default function RegistrationReviewPage({
    params,
}: {
    params: Promise<{ registrationId: string }>
}) {
    const { registrationId } = use(params)
    const router = useRouter()
    const [registration, setRegistration] = useState<RegistrationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isPaying, setIsPaying] = useState(false)
    const [openingFile, setOpeningFile] = useState<string | null>(null)

    useEffect(() => {
        async function fetchRegistration() {
            try {
                setLoading(true)
                const res = await fetch(`/api/registrations/${registrationId}`, {
                    credentials: "include",
                })
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Registration not found")
                    throw new Error("Failed to load registration")
                }
                const data = await res.json()
                setRegistration(data.registration)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong")
            } finally {
                setLoading(false)
            }
        }
        fetchRegistration()
    }, [registrationId])

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
        if (!registration) return
        setIsPaying(true)
        try {
            const loaded = await loadRazorpayScript()
            if (!loaded) {
                alert("Failed to load payment gateway. Please check your connection.")
                return
            }

            const orderRes = await fetch("/api/payment/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: registration.totalAmount,
                    receipt: `bhusetu_reg_${registration.regNumber}_${Date.now()}`,
                }),
            })
            const { orderId, amount, currency } = await orderRes.json()

            // Update registration with razorpay order ID and set PENDING_PAYMENT + deadline
            const deadline = new Date()
            deadline.setDate(deadline.getDate() + 3)

            await fetch(`/api/registrations/${registration.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    razorpayOrderId: orderId,
                    status: "PENDING_PAYMENT",
                    paymentDeadline: deadline.toISOString(),
                }),
            })

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount,
                currency,
                name: "BhuSetu",
                description: `Registration ${formatRegNumber(registration.regYear, registration.regNumber)}`,
                order_id: orderId,
                handler: async (response: {
                    razorpay_order_id: string
                    razorpay_payment_id: string
                    razorpay_signature: string
                }) => {
                    // Verify payment
                    const verifyRes = await fetch("/api/payment/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(response),
                    })
                    const data = await verifyRes.json()
                    if (data.success) {
                        // Update registration status to IN_PROGRESS
                        await fetch(`/api/registrations/${registration.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({
                                status: "IN_PROGRESS",
                                razorpayPaymentId: response.razorpay_payment_id,
                            }),
                        })
                        router.push("/dashboard/registration/success")
                    } else {
                        alert("Payment verification failed. Please contact support.")
                    }
                },
                prefill: { name: registration.ownerName, email: "", contact: "" },
                theme: { color: "#2563eb" },
                modal: { ondismiss: () => setIsPaying(false) },
            }

            const rzp = new window.Razorpay(options)
            rzp.open()
        } catch (err) {
            console.error("Payment error:", err)
            alert("Something went wrong. Please try again.")
        } finally {
            setIsPaying(false)
        }
    }

    // ─── Loading State ───────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-primary" />
                    <p className="text-sm text-slate-500">Loading registration details...</p>
                </div>
            </div>
        )
    }

    // ─── Error State ─────────────────────────────────────────────────
    if (error || !registration) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {error || "Registration not found"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            The registration you&apos;re looking for couldn&apos;t be loaded.
                        </p>
                    </div>
                    <Button onClick={() => router.push("/dashboard/land-records")} variant="outline">
                        Back to Land Records
                    </Button>
                </div>
            </div>
        )
    }

    const documents: UploadedDocument[] = Array.isArray(registration.documents)
        ? registration.documents
        : []

    // ─── Payment deadline info ───────────────────────────────────────
    const deadlineInfo = registration.paymentDeadline
        ? (() => {
            const dl = new Date(registration.paymentDeadline)
            const now = new Date()
            const diffMs = dl.getTime() - now.getTime()
            if (diffMs <= 0) return { expired: true, text: "Payment window expired" }
            const hours = Math.floor(diffMs / (1000 * 60 * 60))
            const days = Math.floor(hours / 24)
            const remHours = hours % 24
            return {
                expired: false,
                text: days > 0 ? `${days}d ${remHours}h remaining` : `${hours}h remaining`,
            }
        })()
        : null

    return (
        <div className="p-6 sm:p-10 mx-auto space-y-6">
            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <Badge variant="outline" className="font-mono text-xs font-bold">
                        {formatRegNumber(registration.regYear, registration.regNumber)}
                    </Badge>
                    {registration.status === "PENDING_PAYMENT" && deadlineInfo && (
                        <Badge
                            variant="outline"
                            className={`gap-1.5 text-xs font-bold ${deadlineInfo.expired
                                ? "bg-red-50 text-red-700 border-red-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                                }`}
                        >
                            <Timer className="size-3" />
                            {deadlineInfo.text}
                        </Badge>
                    )}
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Review & Pay
                </h1>
                <p className="text-slate-500 mt-1">
                    Confirm your registration details and complete payment.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Panel – Review Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Owner & Property Details */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <User className="size-4 text-primary" />
                            <h2 className="text-black text-xs md:text-sm font-semibold">OWNER & PROPERTY DETAILS</h2>
                        </div>
                        <div className="h-px bg-slate-200 mx-0" />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="Legal Owner Name" value={registration.ownerName} />
                            <ReviewField label="Land Area" value={`${registration.landArea.toLocaleString("en-IN")} sqft`} />
                            <ReviewField label="Latest Tax Paid" value={registration.taxPaid ? "Yes" : "No"} />
                            <ReviewField label="Category / Type" value={registration.category} />
                        </div>
                    </section>

                    {/* Boundary Information */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <Landmark className="size-4 text-primary" />
                            <h2 className="text-black text-xs md:text-sm font-semibold">BOUNDARY INFORMATION</h2>
                        </div>
                        <div className="h-px bg-slate-200 mx-0" />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="North Boundary" value={registration.northBoundary} />
                            <ReviewField label="South Boundary" value={registration.southBoundary} />
                            <ReviewField label="East Boundary" value={registration.eastBoundary} />
                            <ReviewField label="West Boundary" value={registration.westBoundary} />
                        </div>
                    </section>

                    {/* Location Information */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <MapPin className="size-4 text-primary" />
                            <h2 className="text-black text-xs md:text-sm font-semibold">LOCATION INFORMATION</h2>
                        </div>
                        <div className="h-px bg-slate-200 mx-0" />
                        <div className="p-6 grid grid-cols-2 gap-x-8 gap-y-4">
                            <ReviewField label="PIN Code" value={registration.pincode} />
                            <ReviewField label="State" value={registration.state} />
                            <ReviewField label="District" value={registration.district} />
                            <ReviewField label="Post Office" value={registration.postOffice} />
                            <ReviewField label="Tehsil / Village" value={registration.tehsil} />
                            <ReviewField label="Plot Number" value={registration.plotNumber} />
                        </div>
                    </section>

                    {/* Uploaded Documents */}
                    <section className="bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <div className="p-6 pb-4 flex items-center gap-2">
                            <FileCheck className="size-4 text-primary" />
                            <h2 className="text-black text-xs md:text-sm font-semibold">UPLOADED DOCUMENTS ({documents.length})</h2>
                        </div>
                        <div className="h-px bg-slate-200 mx-0" />
                        <div className="p-6">
                            {documents.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {documents.map((doc) => (
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
                            <h2 className="text-black text-xs md:text-sm font-semibold">FEE SUMMARY</h2>
                        </div>
                        <div className="h-px bg-slate-200 mx-0" />
                        <div className="p-6 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Processing Fee</span>
                                <span className="font-medium text-slate-900">{formatCurrency(registration.processingFee)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Stamp Duty ({registration.district || "N/A"})</span>
                                <span className="font-medium text-slate-900">{formatCurrency(registration.stampDuty)}</span>
                            </div>
                            <div className="h-px bg-slate-200 my-2" />
                            <div className="flex justify-between text-base font-bold">
                                <span className="text-slate-900">Total Amount</span>
                                <span className="text-primary">{formatCurrency(registration.totalAmount)}</span>
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
                            <ChecklistItem label="Owner details filled" checked={!!registration.ownerName && registration.landArea > 0} />
                            <ChecklistItem label="Boundary details filled" checked={!!registration.northBoundary && !!registration.southBoundary && !!registration.eastBoundary && !!registration.westBoundary} />
                            <ChecklistItem label="Location verified" checked={!!registration.pincode && !!registration.state && !!registration.district} />
                            <ChecklistItem label="Sale Deed uploaded" checked={documents.some(d => d.category === "sale_deed")} />
                            <ChecklistItem label="Tax Receipt uploaded" checked={documents.some(d => d.category === "tax_receipt")} />
                            <ChecklistItem label="Identity Proof uploaded" checked={documents.some(d => d.category === "identity_proof")} />
                        </div>
                    </div>

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
                                onClick={() => router.push("/dashboard/land-records")}
                                className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-500 gap-2"
                            >
                                <ChevronLeft className="size-4" />
                                Back
                            </Button>
                            {(registration.status === "DRAFT" || registration.status === "PENDING_PAYMENT") && (
                                <Button
                                    onClick={handlePayment}
                                    disabled={isPaying || (deadlineInfo?.expired ?? false)}
                                    className="hover:cursor-pointer w-full sm:w-auto px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/25 gap-2"
                                >
                                    {isPaying ? "Processing..." : "Pay & Register"}
                                    {isPaying ? <Loader2 className="size-4 animate-spin" /> : <ChevronRight className="size-4" />}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
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
