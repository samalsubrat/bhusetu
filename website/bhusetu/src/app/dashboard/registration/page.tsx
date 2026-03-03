"use client"

import { useRouter } from "next/navigation"
import { Building2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

export default function RegistrationLandingPage() {
    const router = useRouter()

    const handleYes = () => {
        router.push('/dashboard/registration/details')
    }

    const handleNo = () => {
        router.push('/dashboard')
    }

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-4">
            <Card className="w-full max-w-md shadow-sm border-zinc-200 dark:border-zinc-800">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold tracking-tight">New Registration</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Would you like to start a new property registration process? This will guide you through entering details and uploading documents.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4 justify-center pb-8 pt-2">
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleNo}
                        className="w-full sm:w-auto cursor-pointer"
                    >
                        <X className="w-4 h-4 mr-2" />
                        No, Cancel
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleYes}
                        className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                        Yes, Start
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}