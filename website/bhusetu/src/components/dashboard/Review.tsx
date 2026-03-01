"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "../ui/button"
import { Upload, FileText, Trash2, CreditCard, BadgeIndianRupee, ChevronRight, ArrowRight, ChevronLeft, ShieldCheck, Loader2 } from "lucide-react"

declare global {
    interface Window {
        Razorpay: new (options: Record<string, unknown>) => { open: () => void }
    }
}

const REGISTRATION_AMOUNT = 13950 // ₹13,950

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

    const handlePreviousStep = () => {
        router.push('/dashboard/registration/location')
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
                body: JSON.stringify({ amount: REGISTRATION_AMOUNT, receipt: `bhusetu_${Date.now()}` }),
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
                prefill: { name: '', email: '', contact: '' },
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
            {/* Document Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel  */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <h2 className='text-black text-xs md:text-sm font-semibold pb-4 w-full'>OWNER & PROPERTY DETAILS</h2>
                        <div className='h-px bg-slate-300 -mx-6' />
                        <div className="pt-6">
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-primary/5 hover:border-primary transition-colors cursor-pointer group">
                                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-4">
                                    <Upload className="size-8" />
                                </div>
                                <p className="text-lg font-bold text-slate-900">Drag and drop documents</p>
                                <p className="text-sm text-slate-500 mt-1">PDF, JPG or PNG (Max 10MB each)</p>
                                <Button variant="outline" className="mt-6 rounded-lg font-bold">
                                    Browse Files
                                </Button>
                            </div>
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <FileText className="size-5 text-primary" />
                                        <span className="text-sm font-medium">Sale_Deed_v1.pdf</span>
                                    </div>
                                    <button className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="size-5 text-primary" />
                                        <span className="text-sm font-medium">ID_Proof_Aadhar.jpg</span>
                                    </div>
                                    <button className="text-slate-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
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

                    {/* location verification  */}
                    <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                        <div className="flex items-start gap-4">
                            <div className="p-1.5 bg-blue-100 rounded-lg">
                                <ChevronRight className="size-5 text-blue-600" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <h3 className="text-sm font-bold text-slate-900">Location Verification</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Provide accurate location details. This information will be verified against official records and satellite mapping.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Registration Fee */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <h3 className="font-bold text-slate-900 mb-4">Registration Fee</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Processing Fee</span>
                                <span className="font-semibold">&#8377; 1,500</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-500">Stamp Duty (Estimated)</span>
                                <span className="font-semibold">&#8377; 12,450</span>
                            </div>
                            <div className="pt-3 border-t border-slate-100 flex justify-between">
                                <span className="font-bold text-slate-900">Total</span>
                                <span className="font-bold text-primary">&#8377; 13,950</span>
                            </div>
                            <Button
                                onClick={handlePayment}
                                disabled={isPaying}
                                className="hover:cursor-pointer w-full py-4 rounded-lg text-md font-bold shadow-lg shadow-primary/25 gap-2"
                            >
                                {isPaying ? <Loader2 className="size-4 animate-spin" /> : <BadgeIndianRupee className="size-5" />}
                                {isPaying ? 'Processing...' : 'Pay & Register'}
                            </Button>
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

export default Review