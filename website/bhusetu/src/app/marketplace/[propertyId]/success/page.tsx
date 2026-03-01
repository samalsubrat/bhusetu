import { Footer } from '@/components/footer'
import MaxWidthWrapper from '@/components/MaxWidthWrapper'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, ChevronRight, CloudCheck, FileText, Landmark } from 'lucide-react'
import { Confetti } from '@/components/ui/confetti'
import { Button } from '@/components/ui/button'

const page = () => {
    return (
        <>
            <Confetti className="fixed inset-0 w-full h-full pointer-events-none z-50" />
            <Navbar />
            <MaxWidthWrapper className="py-8 mt-4 min-h-[70vh]">
                <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                    <a className="hover:text-primary" href="#">National Registry</a>
                    <ChevronRight className="w-3 h-3" />
                    <a className="hover:text-primary" href="#">Karnataka State</a>
                    <ChevronRight className="w-3 h-3" />
                    <span className="text-slate-900 dark:text-slate-100 font-medium"> BhuID-8829-XQ</span>
                </nav>

                <div className='space-y-4'>
                    <div className='rounded-xl border-2 border-slate-200 bg-white p-6 space-y-4 flex flex-col items-center justify-center text-center'>
                        <div className='size-24 rounded-full border border-green-300 bg-green-200 flex items-center justify-center'>
                            <CloudCheck className='size-12 text-green-700' />
                        </div>
                        <Badge
                            variant="outline"
                            className="gap-2 border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-green-700"
                        >
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-600" />
                            </span>
                            Documents Received
                        </Badge>
                        <div className='md:px-32 space-y-4'>
                            <h1 className='font-black text-4xl'>Documents submitted successfully, waiting for authority approval.</h1>
                            <h2 className='text-gray-500 tracking-wide md:px-10'>Your application has been logged on the blockchain. The District Registrar's office will now verify the digital signatures and IPFS-linked documents.</h2>
                        </div>
                    </div>

                    <div className="rounded-xl border-2 border-slate-200 bg-white p-6 space-y-4">
                    <h2 className="font-bold text-slate-900 text-sm uppercase tracking-wider">What Happens Next</h2>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-full bg-yellow-100 flex items-center justify-center shrink-0 mt-0.5">
                                <FileText className="size-4 text-yellow-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Authority Approval</p>
                                <p className="text-xs text-slate-500 mt-0.5">Sub-Registrar will review your submitted deeds and identity proofs. Est: 24-48 hours.</p>
                            </div>
                            <span className="ml-auto shrink-0 bg-yellow-200/60 px-2 py-1 rounded text-yellow-700 text-xs font-bold">IN PROGRESS</span>
                        </div>
                        <div className="w-px h-6 bg-slate-200 ml-4" />
                        <div className="flex items-start gap-3 opacity-50">
                            <div className="size-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="size-4 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 text-sm">Secure Payment & Final Settlement</p>
                                <p className="text-xs text-slate-500 mt-0.5">Digital stamp duty payment and final property settlement.</p>
                            </div>
                            <span className="ml-auto shrink-0 bg-blue-100 px-2 py-1 rounded text-blue-600 text-xs font-bold">PENDING</span>
                        </div>
                    </div>
                </div>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6'>
                        <Button className='w-full shadow-sm hover:bg-gray-200 cursor-pointer' variant="outline"><Landmark/>Back to Home</Button>
                        <Button className='w-full cursor-pointer'>View Submissions</Button>
                    </div>
                </div>


            </MaxWidthWrapper>
            <Footer />
        </>
    )
}

export default page