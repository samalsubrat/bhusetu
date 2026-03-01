import { Footer } from '@/components/footer'
import MaxWidthWrapper from '@/components/MaxWidthWrapper'
import Navbar from '@/components/Navbar'
import { Badge } from '@/components/ui/badge'
import { ChevronRight, CloudCheck, FileText, Landmark } from 'lucide-react'
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
                            <h1 className='font-black text-4xl'>Documents submitted successflly, waiting for authority approval.</h1>
                            <h2 className='text-gray-500 tracking-wide md:px-10'>Your application has been logged on the blockchain. The District Registrar's office will now verify the digital signatures and IPFS-linked documents.</h2>
                        </div>
                    </div>

                    <div className='rounded-xl border-2 border-slate-200 bg-white p-4 space-y-4'>
                        <div className="flex items-center justify-between">
                            <div className='flex gap-4'>
                                <div className="size-12 rounded-full bg-yellow-200 flex items-center justify-center text-yellow-600">
                                    <FileText className="size-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Authority Approval</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Sub-Registrar review of submitted deeds and identity proofs. Est: 24-48 hours.</p>
                                </div>
                            </div>
                            <div className='bg-yellow-300/50 px-4 py-2 rounded-sm text-yellow-700 text-xs font-bold'>IN PROGRESS</div>
                        </div>
                        <div className='w-px h-10 bg-gray-300 ml-6 -mt-4 -mb-1'/>
                        <div className="flex items-center justify-between">
                            <div className='flex gap-4'>
                                <div className="size-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <FileText className="size-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Secure Payment</h3>
                                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">Digital stamp duty and final property settlement.</p>
                                </div>
                            </div>
                            <div className='bg-blue-300/50 px-4 py-2 rounded-sm text-blue-700 text-xs font-bold'>PENDING</div>
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