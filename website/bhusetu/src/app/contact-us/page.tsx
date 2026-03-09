import Navbar from "@/components/Navbar"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Phone, MapPin, Info, Send } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import MaxWidthWrapper from "@/components/MaxWidthWrapper"

export default function ContactUsPage() {
    return (
        <>
            <Navbar />

            <MaxWidthWrapper className="py-16">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white mb-4">
                        How can we <span className="text-primary italic">help you?</span>
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                        Access the national land registry support ecosystem. Our team of experts is ready to assist with technical, legal, or administrative queries.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-12 items-start">
                    {/* Left Column: Contact Info */}
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                <span className="w-8 h-1 bg-saffron rounded-full"></span>
                                Get in Touch
                            </h2>
                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                                        <Phone className="size-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Toll Free Number</p>
                                        <p className="text-xl font-bold text-slate-900 dark:text-white">1800-BHUSETU</p>
                                        <p className="text-sm text-slate-500">Available 24/7 for emergency reporting</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
                                        <MapPin className="size-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-primary uppercase tracking-widest mb-1">Headquarters</p>
                                        <p className="text-lg font-semibold text-slate-900 dark:text-white">Ministry of Land Records</p>
                                        <p className="text-slate-600 dark:text-slate-400">Shakti Bhawan, Sector 4, New Delhi, India 110001</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Department Specific Support</p>
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">General Support</p>
                                            <a className="text-primary hover:underline text-sm font-medium" href="mailto:support@bhusetu.gov.in">support@bhusetu.gov.in</a>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Media Relations</p>
                                            <a className="text-primary hover:underline text-sm font-medium" href="mailto:media@bhusetu.gov.in">media@bhusetu.gov.in</a>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">Legal Compliance</p>
                                            <a className="text-primary hover:underline text-sm font-medium" href="mailto:legal@bhusetu.gov.in">legal@bhusetu.gov.in</a>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">API & Tech</p>
                                            <a className="text-primary hover:underline text-sm font-medium" href="mailto:dev@bhusetu.gov.in">dev@bhusetu.gov.in</a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-[#FF9933]/10 border border-[#FF9933]/20 p-6 rounded-2xl">
                            <div className="flex gap-4">
                                <Info className="size-6 text-[#FF9933] shrink-0" />
                                <p className="text-sm text-slate-700 dark:text-slate-300">
                                    <strong className="text-slate-900 dark:text-white">Reporting Fraud?</strong> If you suspect unauthorized access to your digital land records, please use the immediate lock feature in your dashboard or call our emergency hotline.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contact Form */}
                    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/20 dark:border-slate-800/50 rounded-3xl p-8 lg:p-10 shadow-2xl relative">
                        <div className="absolute inset-0 hero-pattern -z-10 rounded-3xl"></div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-8">Send a Message</h3>

                        <form className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Full Name</Label>
                                    <Input
                                        className="w-full bg-white/50 dark:bg-slate-800/50  px-4 py-6"
                                        placeholder="John Doe"
                                        type="text"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</Label>
                                    <Input
                                        className="w-full bg-white/50 dark:bg-slate-800/50  px-4 py-6"
                                        placeholder="john@example.com"
                                        type="email"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Department Selection</Label>
                                <Select>
                                    <SelectTrigger className="w-full bg-white/50 dark:bg-slate-800/50  h-12 px-4 shadow-none">
                                        <SelectValue placeholder="Select Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="technical">Technical Support</SelectItem>
                                        <SelectItem value="registration">Registration Query</SelectItem>
                                        <SelectItem value="legal">Legal Documentation</SelectItem>
                                        <SelectItem value="feedback">Feedback/Suggestions</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Message</Label>
                                <Textarea
                                    className="w-full bg-white/50 dark:bg-slate-800/50 px-4 py-3 min-h-[120px]"
                                    placeholder="How can we assist you today?"
                                />
                            </div>

                            <Button className="w-full font-bold py-6 shadow-lg shadow-primary/25 flex items-center justify-center gap-3 transition-all group cursor-pointer" type="button">
                                Send Inquiry
                                <Send className="size-4 group-hover:translate-x-1 transition-transform" />
                            </Button>

                            <p className="text-center text-[10px] text-slate-400 uppercase font-bold tracking-[0.2em] mt-4">
                                Secured by Blockchain Identity Protection
                            </p>
                        </form>
                    </div>
                </div>

            </MaxWidthWrapper >

            <Footer />
        </>
    )
}
