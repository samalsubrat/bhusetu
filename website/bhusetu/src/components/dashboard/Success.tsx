import Link from "next/link"
import { CheckCircle2, FileText, ArrowRight, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Confetti } from "@/components/ui/confetti"

const Success = () => {
    return (
        <>
            <Confetti className="fixed inset-0 w-full h-full pointer-events-none z-50" />

            <div className="space-y-6 px-4 max-w-5xl mx-auto">
                {/* Success Card */}
                <div className="rounded-xl border-2 border-slate-200 bg-white p-8 flex flex-col items-center text-center gap-4">
                    <div className="size-24 rounded-full border border-green-300 bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="size-12 text-green-600" />
                    </div>

                    <Badge
                        variant="outline"
                        className="gap-2 border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700"
                    >
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                        </span>
                        Payment Successful
                    </Badge>

                    <div className="space-y-2">
                        <h1 className="text-3xl font-black text-slate-900">Registration Submitted!</h1>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-md">
                            Your payment was confirmed and the registration request has been logged on the BhuSetu blockchain. The District Registrar's office will review and approve within 48 hours.
                        </p>
                    </div>

                    {/* Transaction Details */}
                    <div className="w-full bg-slate-50 rounded-lg border border-slate-100 divide-y divide-slate-100 text-sm mt-2">
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-slate-500">Amount Paid</span>
                            <span className="font-bold text-slate-900">₹ 13,950</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-slate-500">Status</span>
                            <span className="font-bold text-green-600">Confirmed</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                            <span className="text-slate-500">Next Step</span>
                            <span className="font-bold text-slate-900">Authority Approval</span>
                        </div>
                    </div>
                </div>

                {/* What Happens Next */}
                <div className="rounded-xl border-2 border-slate-200 bg-white p-6 space-y-4">
                    <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">What Happens Next</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="size-4 text-yellow-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Authority Approval</p>
                                <p className="text-xs text-slate-500 mt-0.5">Sub-Registrar will review your submitted deeds and identity proofs. Est: 24–48 hours.</p>
                            </div>
                            <span className="ml-auto shrink-0 bg-yellow-200/60 px-2 py-1 rounded text-yellow-700 text-xs font-bold">IN PROGRESS</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 ml-4" />
                        <div className="flex items-start gap-3 opacity-50">
                            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="size-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Certificate Issuance</p>
                                <p className="text-xs text-slate-500 mt-0.5">A digitally signed ownership certificate will be issued and stored on-chain.</p>
                            </div>
                            <span className="ml-auto shrink-0 bg-blue-100 px-2 py-1 rounded text-blue-600 text-xs font-bold">PENDING</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button asChild className="flex-1 gap-2">
                        <Link href="/dashboard">
                            <Home className="size-4" />
                            Go to Dashboard
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="flex-1 gap-2">
                        <Link href="/marketplace">
                            Browse Marketplace
                            <ArrowRight className="size-4" />
                        </Link>
                    </Button>
                </div>
            </div>
        </>
    )
}

export default Success
