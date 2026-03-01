import React from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  ShieldCheck,
  Gavel,
  Maximize,
  MapPin,
  User,
  History,
  Home,
  QrCode,
  Wallet,
  ShoppingCart,
  ArrowRight,
  FileText,
  Shield
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import { Footer } from '@/components/footer';
import MaxWidthWrapper from '@/components/MaxWidthWrapper';
import { Button } from '@/components/ui/button';

export default async function PropertyDetails({ params }: { params: Promise<{ propertyId: string }> }) {
  const resolvedParams = await params;
  return (
    <>
      <Navbar />
      <MaxWidthWrapper className='py-8 mt-4'>
        <main>
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
            <a className="hover:text-primary" href="#">National Registry</a>
            <ChevronRight className="w-3 h-3" />
            <a className="hover:text-primary" href="#">Karnataka State</a>
            <ChevronRight className="w-3 h-3" />
            <span className="text-slate-900 dark:text-slate-100 font-medium">{resolvedParams?.propertyId || 'BhuID-8829-XQ'}</span>
          </nav>


          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Visuals */}
            <div className="lg:col-span-2 space-y-4">
              {/* Image Gallery */}
              <div className="relative group">
                <div className="aspect-video rounded-xl overflow-hidden bg-slate-200 shadow-sm border border-slate-200 ">
                  <img className="w-full h-full object-cover" alt="High resolution aerial view of residential plot BhuID-8829" src="/images/property_aerial.jpg" />
                </div>
                {/* Glassmorphism Status Cards Overlay */}
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                  <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-800 shadow-lg border border-white/50 bg-white/80 backdrop-blur-sm">
                    <ShieldCheck className="w-4 h-4 text-green-600" />
                    VERIFIED REGISTRY
                  </div>
                  <div className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold text-slate-800 shadow-lg border border-white/50 bg-white/80 backdrop-blur-sm">
                    <Gavel className="w-4 h-4 text-blue-600" />
                    NO ENCUMBRANCES
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <button className="bg-white/90 hover:bg-white p-2 rounded-full shadow-md transition-all flex items-center justify-center">
                    <Maximize className="w-5 h-5 text-slate-700" />
                  </button>
                </div>
              </div>

              {/* Thumbnails & Map */}
              <div className="grid grid-cols-3 gap-4">
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 ">
                  <img className="w-full h-full object-cover" alt="Front view of the property boundary" src="/images/property_front.jpg" />
                </div>
                <div className="aspect-video rounded-lg overflow-hidden border border-slate-200 ">
                  <img className="w-full h-full object-cover" alt="Topographic layout map of the plot" src="/images/property_topographic.jpg" />
                </div>
                <div className="aspect-video rounded-lg overflow-hidden border border-primary/20 ring-2 ring-primary relative">
                  <img className="w-full h-full object-cover opacity-50 grayscale" alt="Interactive mini map location of property" src="/images/property_map.jpg" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-primary font-bold text-[10px] text-center p-2">
                    <MapPin className="w-6 h-6 mb-1 text-primary" />
                    OPEN MAP
                  </div>
                </div>
              </div>
              {/* Ownership History / Chain of Custody */}
              <section className="bg-white  rounded-xl p-4 shadow-sm border border-slate-200 ">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 ">Chain of Custody</h3>
                    <p className="text-sm text-slate-500">Immutable ledger records from the BhuSetu Mainnet</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 bg-slate-50  px-3 py-1 rounded-full border border-slate-200 ">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    LIVE MAINNET
                  </div>
                </div>
                <div className="relative space-y-4 timeline-line">
                  {/* History Item 1 */}
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-0 w-10 h-10 bg-primary rounded-full flex items-center justify-center border-4 border-white z-10">
                      <User className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-lg bg-primary/5 border border-primary/10 ml-2">
                      <div>
                        <h4 className="font-bold text-slate-900  flex items-center gap-2">
                          Arjun K. Sharma
                          <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded uppercase">Current Owner</span>
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">Hash: 0x71c...a2f9</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 ">Oct 12, 2023</p>
                        <p className="text-xs text-slate-500">Transfer of Title</p>
                      </div>
                    </div>
                  </div>
                  {/* History Item 2 */}
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-0 w-10 h-10 bg-slate-200  rounded-full flex items-center justify-center border-4 border-white  z-10">
                      <History className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-lg border border-slate-100  ml-2">
                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Sumitra Devi Trust</h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">Hash: 0x44d...8e12</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 ">Jan 05, 2018</p>
                        <p className="text-xs text-slate-500">Estate Inheritance</p>
                      </div>
                    </div>
                  </div>
                  {/* History Item 3 */}
                  <div className="relative pl-10">
                    <div className="absolute left-0 top-0 w-10 h-10 bg-slate-200  rounded-full flex items-center justify-center border-4 border-white  z-10">
                      <Home className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-2 rounded-lg border border-slate-100  ml-2">
                      <div>
                        <h4 className="font-bold text-slate-700 dark:text-slate-300">Origin Creation (Government)</h4>
                        <p className="text-xs text-slate-500 font-mono mt-1">Hash: 0x11a...3c5d</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 ">Mar 22, 1995</p>
                        <p className="text-xs text-slate-500">Initial Survey Registry</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>


            {/* Right Column: Details & Actions */}
            <div className="lg:col-span-1 space-y-6">
              {/* Property Title Card */}
              <div className="bg-white  rounded-xl p-4 shadow-sm border border-slate-200 ">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-bold text-primary tracking-widest uppercase">Property BhuID</span>
                    <h2 className="text-3xl font-black text-slate-900  tracking-tight mt-1">{resolvedParams?.propertyId || '8829-XQ-902'}</h2>
                  </div>
                  <div className="w-12 h-12 bg-slate-50  rounded-lg flex items-center justify-center border border-slate-200 ">
                    <QrCode className="w-6 h-6 text-slate-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-600 mb-6">
                  <MapPin className="w-5 h-5 text-slate-500" />
                  <p className="text-sm font-medium">Plot 42, Green Valley Residency, Sector 4, Bangalore East</p>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="p-2 rounded-lg bg-slate-50 /50 border border-slate-100 ">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Total Area</p>
                    <p className="text-lg font-bold text-slate-900">4,500 <span className="text-xs font-normal">sq.ft.</span></p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 /50 border border-slate-100 ">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Zoning Class</p>
                    <p className="text-lg font-bold text-slate-900">R-1 <span className="text-xs font-normal">Residential</span></p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 /50 border border-slate-100 ">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Survey No.</p>
                    <p className="text-lg font-bold text-slate-900">KN-092/22</p>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 /50 border border-slate-100 ">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Valuation</p>
                    <p className="text-lg font-bold text-primary">₹2.45 Cr</p>
                  </div>
                </div>

                {/* Owner Quick View */}
                <div className="border-t border-slate-100  pt-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Current Registered Owner</h4>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Wallet className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 ">Arjun K. Sharma</p>
                      <p className="text-xs text-slate-500">Ownership ID: AS-992-0128</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Panel */}
              <div className="space-y-4">
                <Link href={`/marketplace/${resolvedParams?.propertyId}/buy`}>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white font-bold items-center justify-center gap-3 group cursor-pointer h-10 mb-2">
                    <ShoppingCart className="w-5 h-5 text-white" />
                    Request to Buy
                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button className="w-full flex items-center justify-center gap-3 cursor-pointer h-10" variant="outline">
                  <FileText className="w-5 h-5 " />
                  Download Certified Deed
                </Button>
              </div>


              {/* Blockchain Transparency Card */}
              <div className="bg-primary/5 rounded-xl p-5 border border-primary/10">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-primary shrink-0" />
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 ">Smart Contract Secured</h5>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      This property is managed by Contract <code className="bg-primary/10 px-1 rounded">0xBh...8829</code>. Any transfer requires 2FA and government node validation.
                    </p>
                  </div>
                </div>
              </div>


              {/* Property Features */}
              <div className="bg-white  rounded-xl p-4 shadow-sm border border-slate-200 ">
                <h4 className="text-sm font-bold text-slate-900  mb-4">Property Tags</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-slate-100  px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">Main Road Access</span>
                  <span className="bg-slate-100  px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">Water Connection</span>
                  <span className="bg-slate-100  px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">Clear Title</span>
                  <span className="bg-slate-100  px-3 py-1.5 rounded-full text-xs font-medium text-slate-600 dark:text-slate-400">Vastu Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </MaxWidthWrapper>
      <Footer />
    </>
  );
}
