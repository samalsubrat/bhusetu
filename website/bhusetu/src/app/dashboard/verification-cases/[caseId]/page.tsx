"use client"

import { useEffect, useState, use, lazy, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Loader2,
    AlertCircle,
    ChevronLeft,
    CheckCircle,
    XCircle,
    User,
    Landmark,
    MapPin,
    FileCheck,
    FileText,
    CreditCard,
    ExternalLink,
    RefreshCw,
    TriangleAlert,
    Link2,
} from "lucide-react"

const GISMap = lazy(() => import("@/components/dashboard/GISMap"))

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
    user: {
        id: string
        name: string
        email: string
        phone: string | null
    }
}

// ─── Modal state types ─────────────────────────────────────────────────────────
type ModalState =
    | { type: "confirm"; action: "APPROVE" | "REJECT" }
    | { type: "blockchain-confirm" }
    | { type: "blockchain-processing" }
    | { type: "blockchain-success"; txHash: string; blockNumber: number; bhuSetuId: string }
    | { type: "success"; action: "APPROVE" | "REJECT" }
    | { type: "error"; message: string }
    | null

function formatRegNumber(year: number, num: number): string {
    return `REG-${year}-${String(num).padStart(5, "0")}`
}

function getStatusBadge(status: string) {
    switch (status) {
        case "PENDING_RI_VERIFICATION":
            return (
                <Badge variant="outline" className="gap-1 bg-blue-50 text-blue-700 border-blue-200 text-xs font-bold whitespace-nowrap">
                    <RefreshCw className="size-3" />
                    Pending RI Inspection
                </Badge>
            )
        case "PENDING_ADDL_TAHASILDAR":
            return (
                <Badge variant="outline" className="gap-1 bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold whitespace-nowrap">
                    <RefreshCw className="size-3" />
                    Pending Addl. Tahasildar
                </Badge>
            )
        case "VERIFIED":
            return (
                <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200 text-xs font-bold whitespace-nowrap">
                    <CheckCircle className="size-3" />
                    Verified
                </Badge>
            )
        case "REJECTED":
            return (
                <Badge variant="outline" className="gap-1 bg-red-50 text-red-700 border-red-200 text-xs font-bold whitespace-nowrap">
                    <XCircle className="size-3" />
                    Rejected
                </Badge>
            )
        default:
            return (
                <Badge variant="outline" className="gap-1 bg-slate-50 text-slate-700 border-slate-200 text-xs font-bold whitespace-nowrap">
                    {status.replace(/_/g, " ")}
                </Badge>
            )
    }
}

export default function VerificationCaseDetailPage({
    params,
}: {
    params: Promise<{ caseId: string }>
}) {
    const { caseId } = use(params)
    const router = useRouter()
    const { user: currentUser } = useAuth()
    const [registration, setRegistration] = useState<RegistrationData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [processingAction, setProcessingAction] = useState<string | null>(null)
    const [openingFile, setOpeningFile] = useState<string | null>(null)
    const [modal, setModal] = useState<ModalState>(null)

    useEffect(() => {
        async function fetchCase() {
            try {
                setLoading(true)
                const res = await fetch(`/api/verification-cases/${caseId}`, {
                    credentials: "include",
                })
                if (!res.ok) {
                    if (res.status === 404) throw new Error("Case not found")
                    throw new Error("Failed to load case")
                }
                const data = await res.json()
                setRegistration(data.registration)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Something went wrong")
            } finally {
                setLoading(false)
            }
        }
        fetchCase()
    }, [caseId])

    // Step 1: open confirm modal
    const handleActionClick = (action: "APPROVE" | "REJECT") => {
        setModal({ type: "confirm", action })
    }

    // Detect if this approval will trigger blockchain (PENDING_ADDL_TAHASILDAR → VERIFIED)
    const willTriggerBlockchain = registration?.status === "PENDING_ADDL_TAHASILDAR"

    // Step 2: confirmed — run the API call
    const handleActionConfirm = async () => {
        if (modal?.type !== "confirm") return
        const { action } = modal
        setModal(null)

        try {
            setProcessingAction(action)
            const res = await fetch(`/api/verification-cases/${caseId}`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action }),
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.error || "Action failed")
            }

            // If this was an APPROVE on PENDING_ADDL_TAHASILDAR → show blockchain confirmation
            if (action === "APPROVE" && willTriggerBlockchain) {
                setModal({ type: "blockchain-confirm" })
            } else {
                setModal({ type: "success", action })
            }
        } catch (err: any) {
            setModal({ type: "error", message: err.message })
        } finally {
            setProcessingAction(null)
        }
    }

    // Step 3: execute smart contract
    const handleBlockchainExecute = async () => {
        setModal({ type: "blockchain-processing" })
        try {
            const res = await fetch(`/api/verification-cases/${caseId}/blockchain`, {
                method: "POST",
                credentials: "include",
            })

            if (!res.ok) {
                const body = await res.json()
                throw new Error(body.error || "Blockchain execution failed")
            }

            const data = await res.json()
            setModal({
                type: "blockchain-success",
                txHash: data.txHash,
                blockNumber: data.blockNumber,
                bhuSetuId: data.bhuSetuId,
            })
        } catch (err: any) {
            setModal({ type: "error", message: err.message })
        }
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
        } catch {
            setModal({ type: "error", message: "Failed to open file. Please try again." })
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <p className="text-sm text-slate-500">Loading case details...</p>
                </div>
            </div>
        )
    }

    if (error || !registration) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="size-16 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertCircle className="size-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            {error || "Case not found"}
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">
                            The verification case you&apos;re looking for couldn&apos;t be loaded.
                        </p>
                    </div>
                    <Button onClick={() => router.push("/dashboard/verification-cases")} variant="outline">
                        Back to Cases
                    </Button>
                </div>
            </div>
        )
    }

    const documents: UploadedDocument[] = Array.isArray(registration.documents)
        ? registration.documents
        : []

    const canAct = ["PENDING_RI_VERIFICATION", "PENDING_ADDL_TAHASILDAR"].includes(registration.status)

    const isApprove = modal?.type === "confirm" && modal.action === "APPROVE"
        || modal?.type === "success" && modal.action === "APPROVE"

    return (
        <>
            {/* ── Confirm modal ──────────────────────────────────────── */}
            <Dialog open={modal?.type === "confirm"} onOpenChange={(open: boolean) => !open && setModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className={`mx-auto mb-2 size-12 rounded-full flex items-center justify-center ${isApprove ? "bg-green-100" : "bg-red-100"}`}>
                            {isApprove
                                ? <CheckCircle className="size-6 text-green-600" />
                                : <XCircle className="size-6 text-red-600" />
                            }
                        </div>
                        <DialogTitle className="text-center">
                            {isApprove ? "Approve & Advance Case?" : "Reject This Case?"}
                        </DialogTitle>
                        <DialogDescription className="text-center">
                            {isApprove
                                ? "This will mark the case as verified and move it to the next stage. This action can be reviewed by a senior officer."
                                : "This will reject the registration case. The applicant will be notified. This action cannot be undone easily."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
                        <Button variant="outline" onClick={() => setModal(null)} className="w-full sm:w-auto">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleActionConfirm}
                            className={`w-full sm:w-auto ${isApprove ? "bg-green-600 hover:bg-green-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}`}
                        >
                            {isApprove ? "Yes, Approve" : "Yes, Reject"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Blockchain confirm modal ────────────────────────────── */}
            <Dialog open={modal?.type === "blockchain-confirm"} onOpenChange={(open: boolean) => !open && setModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-2 size-14 rounded-full bg-linear-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                            <Link2 className="size-7 text-indigo-600" />
                        </div>
                        <DialogTitle className="text-center">Execute Smart Contract</DialogTitle>
                        <DialogDescription className="text-center">
                            The case has been approved. Would you like to record this land registration on the blockchain? This will create an immutable, tamper-proof record of the property.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-700 space-y-1 mt-1">
                        <p className="font-semibold">What happens next:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>All registration details will be written on-chain</li>
                            <li>Document CIDs are linked in the smart contract</li>
                            <li>A unique BHU Property ID is minted</li>
                            <li>The transaction hash will be stored as proof</li>
                        </ul>
                    </div>
                    <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 mt-2">
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => {
                            setModal(null)
                            router.push("/dashboard/verification-cases")
                        }}>
                            Skip for Now
                        </Button>
                        <Button
                            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                            onClick={handleBlockchainExecute}
                        >
                            <Link2 className="size-4" />
                            Execute Smart Contract
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Blockchain processing modal ─────────────────────────── */}
            <Dialog open={modal?.type === "blockchain-processing"} onOpenChange={() => {}}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e: Event) => e.preventDefault()}>
                    <DialogHeader>
                        <div className="mx-auto mb-2 size-14 rounded-full bg-linear-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
                            <Loader2 className="size-7 text-indigo-600 animate-spin" />
                        </div>
                        <DialogTitle className="text-center">Recording on Blockchain</DialogTitle>
                        <DialogDescription className="text-center">
                            Please wait while the smart contract is being executed. This may take a few seconds...
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-2">
                        <div className="flex gap-1">
                            <div className="size-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="size-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="size-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Blockchain success modal ─────────────────────────────── */}
            <Dialog
                open={modal?.type === "blockchain-success"}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setModal(null)
                        router.push("/dashboard/verification-cases")
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-2 size-14 rounded-full bg-linear-to-br from-green-100 to-emerald-100 flex items-center justify-center">
                            <CheckCircle className="size-7 text-green-600" />
                        </div>
                        <DialogTitle className="text-center">Blockchain Record Created!</DialogTitle>
                        <DialogDescription className="text-center">
                            The land registration has been permanently recorded on the blockchain.
                        </DialogDescription>
                    </DialogHeader>
                    {modal?.type === "blockchain-success" && (
                        <div className="rounded-lg border border-green-100 bg-green-50/50 p-3 text-xs space-y-2 mt-1">
                            <div>
                                <span className="text-slate-500 font-medium">BHU Property ID</span>
                                <p className="font-bold text-slate-900 font-mono">{modal.bhuSetuId}</p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Transaction Hash</span>
                                <p className="font-mono text-slate-700 break-all">{modal.txHash}</p>
                            </div>
                            <div>
                                <span className="text-slate-500 font-medium">Block Number</span>
                                <p className="font-mono text-slate-700">{modal.blockNumber}</p>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="mt-2">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                setModal(null)
                                router.push("/dashboard/verification-cases")
                            }}
                        >
                            Back to Cases
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Success modal (non-blockchain) ──────────────────────── */}
            <Dialog
                open={modal?.type === "success"}
                onOpenChange={(open: boolean) => {
                    if (!open) {
                        setModal(null)
                        router.push("/dashboard/verification-cases")
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-2 size-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="size-6 text-green-600" />
                        </div>
                        <DialogTitle className="text-center">Action Successful</DialogTitle>
                        <DialogDescription className="text-center">
                            {modal?.type === "success" && modal.action === "APPROVE"
                                ? "The case has been approved and advanced to the next stage."
                                : "The case has been rejected successfully."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-2">
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => {
                                setModal(null)
                                router.push("/dashboard/verification-cases")
                            }}
                        >
                            Back to Cases
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Error modal ────────────────────────────────────────── */}
            <Dialog open={modal?.type === "error"} onOpenChange={(open: boolean) => !open && setModal(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="mx-auto mb-2 size-12 rounded-full bg-red-100 flex items-center justify-center">
                            <TriangleAlert className="size-6 text-red-600" />
                        </div>
                        <DialogTitle className="text-center">Something went wrong</DialogTitle>
                        <DialogDescription className="text-center">
                            {modal?.type === "error" ? modal.message : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-2">
                        <Button variant="outline" className="w-full" onClick={() => setModal(null)}>
                            Dismiss
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Page content ───────────────────────────────────────── */}
            <div className="p-6 sm:p-10 mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <button
                            onClick={() => router.push("/dashboard/verification-cases")}
                            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-2 transition-colors"
                        >
                            <ChevronLeft className="size-4" />
                            Back to Cases
                        </button>
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                {formatRegNumber(registration.regYear, registration.regNumber)}
                            </h1>
                            {getStatusBadge(registration.status)}
                        </div>
                        <p className="text-slate-500 mt-1">
                            Submitted on{" "}
                            {new Date(registration.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                            })}
                        </p>
                    </div>

                    {canAct && (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 gap-1.5"
                                disabled={!!processingAction}
                                onClick={() => handleActionClick("REJECT")}
                            >
                                {processingAction === "REJECT" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                                Reject
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                disabled={!!processingAction}
                                onClick={() => handleActionClick("APPROVE")}
                            >
                                {processingAction === "APPROVE" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                                Verify & Advance
                            </Button>
                        </div>
                    )}
                </div>

                {/* Applicant Info */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <User className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">APPLICANT INFORMATION</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
                        <ReviewField label="Applicant Name" value={registration.user.name} />
                        <ReviewField label="Email" value={registration.user.email} />
                        <ReviewField label="Phone" value={registration.user.phone || "Not provided"} />
                        <ReviewField label="Legal Owner Name" value={registration.ownerName} />
                    </div>
                </section>

                {/* Property Details */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <Landmark className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">PROPERTY DETAILS</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
                        <ReviewField label="Land Area" value={`${registration.landArea.toLocaleString("en-IN")} sqft`} />
                        <ReviewField label="Category / Type" value={registration.category} />
                        <ReviewField label="Latest Tax Paid" value={registration.taxPaid ? "Yes" : "No"} />
                        <ReviewField label="Plot Number" value={registration.plotNumber} />
                    </div>
                </section>

                {/* Boundary Information */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <Landmark className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">BOUNDARY INFORMATION</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-4">
                        <ReviewField label="North Boundary" value={registration.northBoundary} />
                        <ReviewField label="South Boundary" value={registration.southBoundary} />
                        <ReviewField label="East Boundary" value={registration.eastBoundary} />
                        <ReviewField label="West Boundary" value={registration.westBoundary} />
                    </div>
                </section>

                {/* Location Information */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <MapPin className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">LOCATION INFORMATION</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
                        <ReviewField label="PIN Code" value={registration.pincode} />
                        <ReviewField label="State" value={registration.state} />
                        <ReviewField label="District" value={registration.district} />
                        <ReviewField label="Post Office" value={registration.postOffice} />
                        <ReviewField label="Tehsil / Village" value={registration.tehsil} />
                        <ReviewField label="Plot Number" value={registration.plotNumber} />
                    </div>
                </section>

                {/* GIS Map */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <MapPin className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">GIS MAP VIEW</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
                    <div className="p-6">
                        <Suspense fallback={
                            <div className="h-[400px] bg-slate-100 rounded-lg flex items-center justify-center">
                                <Loader2 className="size-6 animate-spin text-slate-400" />
                            </div>
                        }>
                            <GISMap className="h-[400px] rounded-lg" />
                        </Suspense>
                    </div>
                </section>

                {/* Documents */}
                <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-6 pb-4 flex items-center gap-2">
                        <FileCheck className="size-4 text-primary" />
                        <h2 className="text-black text-xs md:text-sm font-semibold">UPLOADED DOCUMENTS ({documents.length})</h2>
                    </div>
                    <div className="h-px bg-slate-200" />
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

                {/* Bottom Action Bar */}
                {canAct && (
                    <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <p className="text-sm text-slate-500">
                            Review all details above before taking action.
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 border-red-200 gap-1.5"
                                disabled={!!processingAction}
                                onClick={() => handleActionClick("REJECT")}
                            >
                                {processingAction === "REJECT" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
                                Reject
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                disabled={!!processingAction}
                                onClick={() => handleActionClick("APPROVE")}
                            >
                                {processingAction === "APPROVE" ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
                                Verify & Advance
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}

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
