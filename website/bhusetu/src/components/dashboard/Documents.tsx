"use client"

import { useState } from "react";
import { useRouter } from 'next/navigation'
import { Button } from "../ui/button"
import { Upload, FileText, Trash2, CreditCard, ChevronRight, ArrowRight, ChevronLeft, ShieldCheck, MapPin, RefreshCw } from "lucide-react"


const Documents = () => {
    const router = useRouter()
    const handleNextStep = () => {
        router.push('/dashboard/registration/review')
    }

    const handlePreviousStep = () => {
        router.push('/dashboard/registration/location')
    }

    const [file, setFile] = useState<File>();
    const [url, setUrl] = useState("");
    const [uploading, setUploading] = useState(false);

    const uploadFile = async () => {
        try {
            if (!file) {
                alert("No file selected");
                return;
            }

            setUploading(true);
            const data = new FormData();
            data.set("file", file);
            const uploadRequest = await fetch("/api/files", {
                method: "POST",
                body: data,
            });
            const signedUrl = await uploadRequest.json();
            setUrl(signedUrl);
            setUploading(false);
        } catch (e) {
            console.log(e);
            setUploading(false);
            alert("Trouble uploading file");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target?.files?.[0]);
    };

    return (
        <>
            {/* Document Upload */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Panel  */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Digilocker 
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
                    </div> */}

                    {/* cards  */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Sale Deed */}
                        <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <FileText className="size-6" />
                                </div>
                                <div className="size-6 rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Sale Deed</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Mandatory legal document for land registration.</p>
                            </div>
                            <div className="mt-auto pt-2">
                                <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                                    <FileText className="size-4 text-blue-600 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">Sale_Deed_v1.pdf</span>
                                </div>
                                <p className="text-xs font-bold text-green-600 mt-2 uppercase tracking-wider">Uploaded</p>
                            </div>
                        </div>

                        {/* Tax Receipts */}
                        <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="size-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                                    <CreditCard className="size-6" />
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Tax Receipts</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Upload latest property tax clearance receipts.</p>
                            </div>
                            <div className="mt-auto pt-2">
                                <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                                    <Upload className="size-4 text-slate-400" />
                                    <span className="text-sm text-slate-500 font-medium">Upload File</span>
                                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleChange} />
                                </label>
                                <p className="text-xs font-bold text-amber-500 mt-2 uppercase tracking-wider">Pending</p>
                            </div>
                        </div>

                        {/* Identity Proof */}
                        <div className="relative p-4 rounded-xl border-2 border-slate-200 bg-white flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                                <div className="size-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                                    <CreditCard className="size-6" />
                                </div>
                                <div className="size-6 rounded-full bg-green-500 flex items-center justify-center">
                                    <svg className="size-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                </div>
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900">Aadhar Card</h3>
                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">Government issued ID for Identity Proof.</p>
                            </div>
                            <div className="mt-auto pt-2">
                                <div className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200">
                                    <CreditCard className="size-4 text-blue-600 shrink-0" />
                                    <span className="text-xs font-medium text-slate-700 truncate">ID_Proof_Aadhar.jpg</span>
                                </div>
                                <p className="text-xs font-bold text-green-600 mt-2 uppercase tracking-wider">Uploaded</p>
                            </div>
                        </div>
                    </div>
                    <section className="p-6 bg-white rounded-xl shadow-sm border border-gray-300 overflow-hidden">
                        <h2 className='text-black text-xs md:text-sm font-semibold pb-4  w-full'>REQUIRED DOCUMENTS</h2>
                        <div className='h-px bg-slate-300 -mx-6' />
                        <div className="pt-6">
                            <div className="border-2 border-dashed border-slate-200 rounded-lg p-10 flex flex-col items-center justify-center bg-slate-50/50 hover:bg-primary/5 hover:border-primary transition-colors cursor-pointer group">
                                <div className="size-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/10 transition-colors mb-4">
                                    <Upload className="size-8" />
                                </div>
                                <p className="text-lg font-bold text-slate-900">Drag and drop any other documents</p>
                                <p className="text-sm text-slate-500 mt-1">PDF, JPG or PNG (Max 1MB each)</p>
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