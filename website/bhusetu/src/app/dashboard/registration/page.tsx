"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RegistrationPage() {
    const router = useRouter()
    
    useEffect(() => {
        // Redirect to the first step (details)
        router.replace('/dashboard/registration/details')
    }, [router])

    return (
        <div className="flex items-center justify-center min-h-100">
            <p className="text-slate-500">Redirecting to registration details...</p>
        </div>
    )
}