"use client"

import { useState, useRef } from "react";
import { useRouter } from 'next/navigation'
import { Button } from "../ui/button"
import { Upload, FileText, Trash2, CreditCard, ChevronRight, ArrowRight, ChevronLeft, ShieldCheck, Loader2, ExternalLink, Lock } from "lucide-react"
import RegistrationFeeSidebar from "@/components/dashboard/RegistrationFeeSidebar"
import { useRegistration, validateDocumentsStep, type UploadedDocument, type ValidationErrors } from "@/context/RegistrationContext"

type DocCategory = UploadedDocument["category"]

const Documents = () => {
    const router = useRouter()
    const dropzoneInputRef = useRef<HTMLInputElement>(null)
    const { data: regData, addDocument, removeDocument } = useRegistration()

    const [uploading, setUploading] = useState(false)
    const [uploadingCategory, setUploadingCategory] = useState<DocCategory | null>(null)
    const [openingFile, setOpeningFile] = useState<string | null>(null)
    const [errors, setErrors] = useState<ValidationErrors>({})

    const handleNextStep = () => {
        const validationErrors = validateDocumentsStep(regData)
        setErrors(validationErrors)
        if (Object.keys(validationErrors).length > 0) return
        router.push('/dashboard/registration/review')
    }

    const handlePreviousStep = () => {
        router.push('/dashboard/registration/location')
    }

    const uploadFile = async (file: File, category: DocCategory) => {
        try {
            setUploading(true)
            setUploadingCategory(category)
            const data = new FormData()
            data.set("file", file)
            const res = await fetch("/api/files", {
                method: "POST",
                body: data,
            })
            if (!res.ok) throw new Error("Upload failed")
            const result = await res.json()
            addDocument({
                id: result.id,
                cid: result.cid,
                name: result.name,
                size: result.size,
                mimeType: result.mimeType,
                category,
            })
            // Clear the error for this category once uploaded
            setErrors(prev => {
                const next = { ...prev }
                delete next[category]
                return next
            })
        } catch (e) {
            console.error(e)
            alert("Failed to upload file. Please try again.")
        } finally {
            setUploading(false)
            setUploadingCategory(null)
        }
    }

    const handleCategoryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, category: DocCategory) => {
        const file = e.target?.files?.[0]
        if (file) await uploadFile(file, category)
        e.target.value = ""
    }

    const handleDropzoneFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target?.files?.[0]
        if (file) await uploadFile(file, "other")
        e.target.value = ""
    }

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault()
        const file = e.dataTransfer.files?.[0]
        if (file) await uploadFile(file, "other")
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
    }

    const handleRemoveFile = async (doc: UploadedDocument) => {
        try {
            await fetch("/api/files", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: [doc.id] }),
            })
            removeDocument(doc.cid)
        } catch (e) {
            console.error(e)
            alert("Failed to delete file. Please try again.")
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
        } catch (e) {
            console.error(e)
            alert("Failed to open file. Please try again.")
        } finally {
            setOpeningFile(null)
        }
    }

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const getFileIcon = (mimeType: string) => {
        if (mimeType.includes("pdf")) return <FileText className="size-4 text-red-500 shrink-0" />
        if (mimeType.includes("image")) return <CreditCard className="size-4 text-blue-500 shrink-0" />
        return <FileText className="size-4 text-primary shrink-0" />
    }

    const getCategoryDocs = (category: DocCategory) => regData.documents.filter(d => d.category === category)

    const categoryCards: { category: DocCategory; label: string; description: string; icon: React.ReactNode; bgColor: string; iconColor: string }[] = [
        {
            category: "sale_deed",
            label: "Sale Deed",
            description: "Mandatory legal document for land registration.",
            icon: <FileText className="size-6" />,
            bgColor: "bg-blue-100",
            iconColor: "text-blue-600",
        },
        {
            category: "tax_receipt",
            label: "Tax Receipts",
            description: "Upload latest property tax clearance receipts.",
            icon: <CreditCard className="size-6" />,
            bgColor: "bg-slate-100",
            iconColor: "text-slate-500",
        },
        {
            category: "identity_proof",
            label: "Aadhar Card",
            description: "Government issued ID for Identity Proof.",
            icon: <CreditCard className="size-6" />,
            bgColor: "bg-blue-100",
            iconColor: "text-blue-600",
        },
    ]

    return (
        <>
            {/* Document Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel  */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Document Type Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {categoryCards.map((card) => {
                            const docs = getCategoryDocs(card.category)
                            const hasDoc = docs.length > 0
                            const hasError = !!errors[card.category]
                            return (
                                <div
                                    key={card.category}
                                    className={`relative p-4 rounded-xl border-2 bg-white flex flex-col gap-3 transition-colors ${hasError ? "border-red-400 bg-red-50/30" : "border-slate-200"}`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className={`size-12 rounded-xl ${card.bgColor} flex items-center justify-center ${card.iconColor}`}>
                                            {card.icon}
                                        </div>
                                        {hasDoc && (
                                            <div className="size-6 rounded-full bg-green-500 flex items-center justify-center">
                                                <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900">{card.label}</h3>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{card.description}</p>
                                    </div>

                                    {/* Show uploaded file for this category */}
                                    {docs.map((doc) => (
                                        <div key={doc.cid} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-200 text-xs">
                                            <button
                                                onClick={() => handleOpenFile(doc)}
                                                className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer"
                                                title="Click to view"
                                            >
                                                {getFileIcon(doc.mimeType)}
                                                <span className="truncate font-medium text-slate-700">{doc.name}</span>
                                                {openingFile === doc.cid ? (
                                                    <Loader2 className="size-3 animate-spin text-primary shrink-0" />
                                                ) : (
                                                    <ExternalLink className="size-3 text-slate-400 shrink-0" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleRemoveFile(doc)}
                                                className="text-slate-400 hover:text-red-500 transition-colors ml-2 cursor-pointer shrink-0"
                                                title="Remove file"
                                            >
                                                <Trash2 className="size-3.5" />
                                            </button>
                                        </div>
                                    ))}

                                    <div className="mt-auto pt-2">
                                        <label className={`flex items-center justify-center gap-2 p-3 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${hasError ? "border-red-300 hover:border-red-500 hover:bg-red-50" : "border-slate-200 hover:border-primary hover:bg-primary/5"}`}>
                                            {uploadingCategory === card.category ? (
                                                <Loader2 className="size-4 animate-spin text-primary" />
                                            ) : (
                                                <Upload className="size-4 text-slate-400" />
                                            )}
                                            <span className="text-sm text-slate-500 font-medium">
                                                {uploadingCategory === card.category ? "Uploading..." : (hasDoc ? "Replace File" : "Upload File")}
                                            </span>
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.jpg,.jpeg,.png"
                                                onChange={(e) => handleCategoryFileSelect(e, card.category)}
                                                disabled={uploading}
                                            />
                                        </label>
                                    </div>
                                    {hasError && <p className="text-xs text-red-500 font-medium">{errors[card.category]}</p>}
                                </div>
                            )
                        })}
                    </div>

                    {/* Drag & Drop + Uploaded Files */}
                    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <h2 className='text-black text-xs md:text-sm font-semibold pb-4 w-full'>ADDITIONAL DOCUMENTS (OPTIONAL)</h2>
                        <div className='h-px bg-slate-300 -mx-6' />
                        <div className="pt-6">
                            <div
                                className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-primary/5 hover:border-primary transition-colors cursor-pointer group"
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onClick={() => dropzoneInputRef.current?.click()}
                            >
                                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-4">
                                    {uploading && uploadingCategory === "other" ? <Loader2 className="size-8 animate-spin" /> : <Upload className="size-8" />}
                                </div>
                                <p className="text-lg font-bold text-slate-900">
                                    {uploading && uploadingCategory === "other" ? "Encrypting & uploading..." : "Drag and drop documents"}
                                </p>
                                <p className="text-sm text-slate-500 mt-1">PDF, JPG or PNG (Max 10MB each)</p>
                                <div className="flex items-center gap-1.5 mt-2 text-xs text-primary font-medium">
                                    <Lock className="size-3" />
                                    Files are encrypted before upload to IPFS
                                </div>
                                {!(uploading && uploadingCategory === "other") && (
                                    <Button variant="outline" className="mt-6 rounded-lg font-bold" onClick={(e) => { e.stopPropagation(); dropzoneInputRef.current?.click() }}>
                                        Browse Files
                                    </Button>
                                )}
                                <input
                                    ref={dropzoneInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={handleDropzoneFileSelect}
                                />
                            </div>

                            {/* Uploaded Other Files List */}
                            {getCategoryDocs("other").length > 0 && (
                                <div className="mt-4 space-y-2">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                                        Additional ({getCategoryDocs("other").length} file{getCategoryDocs("other").length !== 1 ? "s" : ""})
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {getCategoryDocs("other").map((f) => (
                                            <div
                                                key={f.cid}
                                                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-primary/30 transition-colors group/file"
                                            >
                                                <button
                                                    onClick={() => handleOpenFile(f)}
                                                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                                    title="Click to view document"
                                                >
                                                    {getFileIcon(f.mimeType)}
                                                    <div className="min-w-0 flex-1">
                                                        <span className="text-sm font-medium truncate block group-hover/file:text-primary transition-colors">
                                                            {f.name}
                                                        </span>
                                                        <span className="text-xs text-slate-400">{formatFileSize(f.size)}</span>
                                                    </div>
                                                    {openingFile === f.cid ? (
                                                        <Loader2 className="size-4 animate-spin text-primary shrink-0" />
                                                    ) : (
                                                        <ExternalLink className="size-4 text-slate-300 group-hover/file:text-primary shrink-0 transition-colors" />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleRemoveFile(f)}
                                                    className="text-slate-300 hover:text-red-500 transition-colors ml-2 cursor-pointer shrink-0"
                                                    title="Remove file"
                                                >
                                                    <Trash2 className="size-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
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

                    {/* Encryption Info */}
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-start gap-4">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <Lock className="size-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-sm font-bold text-slate-900">Encrypted Storage</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    All documents are encrypted before being uploaded to IPFS via Pinata&apos;s private network. Only authorized parties can access them via time-limited signed URLs.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Mandatory Documents Checklist */}
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-900 mb-3">Mandatory Documents</h3>
                        <div className="space-y-2">
                            {categoryCards.map((card) => {
                                const hasDoc = getCategoryDocs(card.category).length > 0
                                return (
                                    <div key={card.category} className="flex items-center gap-3">
                                        <div className={`size-5 rounded-full flex items-center justify-center ${hasDoc ? "bg-green-500" : "bg-slate-200"}`}>
                                            {hasDoc ? (
                                                <svg className="size-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                            ) : (
                                                <div className="size-2 rounded-full bg-slate-400" />
                                            )}
                                        </div>
                                        <span className={`text-sm ${hasDoc ? "text-green-700 font-medium" : "text-slate-500"}`}>
                                            {card.label}
                                        </span>
                                    </div>
                                )
                            })}
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
                        <Button variant="ghost" className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-600">
                            Save Draft
                        </Button>
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
                                onClick={handleNextStep}
                                className="hover:cursor-pointer w-full sm:w-auto px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/25 gap-2"
                            >
                                Next Step
                                <ChevronRight className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

            </div>
        </>
    )
}

export default Documents