import Success from "@/components/dashboard/Success"
import { RegistrationProvider } from "@/context/RegistrationContext"

const page = () => {
    return (
        <RegistrationProvider>
            <div className="p-6 sm:p-10 mx-auto text-center">
                <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    Land Registration Workflow
                </h1>
                <p className="text-slate-500 mt-2">
                    Submit property details for verification and immutable blockchain ledger recording.
                </p>
            </div>
            <Success />
        </RegistrationProvider>
    )
}

export default page
