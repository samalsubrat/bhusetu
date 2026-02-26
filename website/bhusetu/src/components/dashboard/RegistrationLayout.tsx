"use client"

import { Check } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"

interface RegistrationLayoutProps {
    children: React.ReactNode
}

const steps = [
    { number: 1, label: "Details", route: "/dashboard/registration/details" },
    { number: 2, label: "Location", route: "/dashboard/registration/location" },
    { number: 3, label: "Documents", route: "/dashboard/registration/documents" },
    { number: 4, label: "Review", route: "/dashboard/registration/review" },
]

export default function RegistrationLayout({ children }: RegistrationLayoutProps) {
    const pathname = usePathname()
    const router = useRouter()
    
    const getCurrentStep = () => {
        return steps.findIndex(step => pathname === step.route) + 1
    }

    const currentStep = getCurrentStep()

    const handleStepClick = (step: typeof steps[0]) => {
        router.push(step.route)
    }

    return (
        <div className="flex flex-1 flex-col gap-8 p-6 sm:p-10 mx-auto"> 
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Land Registration Workflow
                </h1>
                <p className="text-slate-500 mt-2">
                    Submit property details for verification and immutable blockchain ledger recording.
                </p>
            </div>

            {/* Progress Stepper */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between relative">
                    <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-0" />
                    {steps.map((step) => {
                        const isActive = step.number === currentStep
                        const isCompleted = step.number < currentStep
                        const isClickable = step.number <= currentStep || isCompleted
                        
                        return (
                            <div key={step.number} className="relative z-10 flex flex-col items-center">
                                <div
                                    className={`size-10 rounded-full flex items-center justify-center font-bold ring-4 ring-white cursor-pointer transition-colors ${
                                        isActive
                                            ? "bg-primary text-white"
                                            : isCompleted
                                            ? "bg-green-500 text-white font-bold"
                                            : "bg-slate-100 text-slate-400"
                                    }`}
                                    onClick={() => handleStepClick(step)}
                                >
                                    {isCompleted ? <Check className="font-black"/> : step.number}
                                </div>
                                <span
                                    className={`mt-2 text-xs font-bold uppercase tracking-wider ${
                                        isActive 
                                            ? "text-primary" 
                                            : isCompleted
                                            ? "text-green-500"
                                            : "text-slate-400"
                                    }`}
                                >
                                    {step.label}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Main Content */}
            {children}
        </div>
    )
}