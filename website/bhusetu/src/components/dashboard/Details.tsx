"use client"

import { useRouter } from 'next/navigation'
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import {
    Combobox,
    ComboboxContent,
    ComboboxEmpty,
    ComboboxInput,
    ComboboxItem,
    ComboboxList,
} from "@/components/ui/combobox"

import {
    ShieldCheck,
    ChevronRight,
    ArrowRight,
} from "lucide-react"

import { useRegistration } from "@/context/RegistrationContext"
import RegistrationFeeSidebar from "@/components/dashboard/RegistrationFeeSidebar"

const categories = [
    "Residential",
    "Green Zone",
    "Yellow Zone",
    "Red Zone",
    "Commercial",
] as const


const tax = [
    "Yes",
    "No",
] as const

const Details = () => {
    const router = useRouter()
    const { data, updateField } = useRegistration()

    const handleNextStep = () => {
        router.push('/dashboard/registration/location')
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Forms */}
            <div className="lg:col-span-2 space-y-6">
                {/* Property Details */}
                <div className='p-6 bg-white border border-gray-300 rounded-lg shadow-sm '>
                    <h2 className='text-black text-xs md:text-sm font-semibold pb-4  w-full'>PROPERTY INFORMATION</h2>
                    <div className='h-px bg-slate-300 -mx-6' />
                    <h2 className='text-gray-500 text-sm mt-4'>Specify details about your plot.</h2>
                    <div className='grid grid-cols-2 gap-4 mt-4'>
                        <Field>
                            <FieldLabel htmlFor="owner-name" className='text-xs -mb-1 text-gray-500'>LEGAL OWNER NAME<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="owner-name"
                                type="text"
                                placeholder="Enter your name"
                                value={data.ownerName}
                                onChange={(e) => updateField("ownerName", e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="land-area" className='text-xs -mb-1 text-gray-500'>LAND AREA (sqft)<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="land-area"
                                type="text"
                                inputMode="numeric"
                                placeholder="Enter the land area in sqft"
                                value={data.landArea}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/[^\d.]/g, "")
                                    updateField("landArea", val)
                                }}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="tax-paid" className='text-xs -mb-1 text-gray-500'>LATEST TAX PAID<span className="text-destructive">*</span></FieldLabel>
                            <Combobox
                                items={tax}
                                value={data.taxPaid}
                                onValueChange={(val) => updateField("taxPaid", val ?? "")}
                            >
                                <ComboboxInput placeholder="Yes or No" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item) => (
                                            <ComboboxItem key={item} value={item}>
                                                {item}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="category" className='text-xs -mb-1 text-gray-500'>CATEGORY / TYPE<span className="text-destructive">*</span></FieldLabel>
                            <Combobox
                                items={categories}
                                value={data.category}
                                onValueChange={(val) => updateField("category", val ?? "")}
                            >
                                <ComboboxInput placeholder="Select a category" />
                                <ComboboxContent>
                                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                                    <ComboboxList>
                                        {(item) => (
                                            <ComboboxItem key={item} value={item}>
                                                {item}
                                            </ComboboxItem>
                                        )}
                                    </ComboboxList>
                                </ComboboxContent>
                            </Combobox>
                        </Field>
                    </div>
                </div>

                {/* Boundary Details */}
                <div className='p-6 bg-white border border-gray-300 rounded-lg shadow-sm '>
                    <h2 className='text-black text-xs md:text-sm font-semibold pb-4  w-full'>BOUNDARY INFORMATION</h2>
                    <div className='h-px bg-slate-300 -mx-6' />
                    <h2 className='text-gray-500 text-sm mt-4'>Specify neighboring plot details to establish property boundaries.</h2>
                    <div className='grid grid-cols-2 gap-4 mt-4'>
                        <Field>
                            <FieldLabel htmlFor="north-boundary" className='text-xs -mb-1 text-gray-500'>NORTH BOUNDARY<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="north-boundary"
                                type="text"
                                placeholder="Neighboring Plot Name"
                                value={data.northBoundary}
                                onChange={(e) => updateField("northBoundary", e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="south-boundary" className='text-xs -mb-1 text-gray-500'>SOUTH BOUNDARY<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="south-boundary"
                                type="text"
                                placeholder="Neighboring Plot Name"
                                value={data.southBoundary}
                                onChange={(e) => updateField("southBoundary", e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="east-boundary" className='text-xs -mb-1 text-gray-500'>EAST BOUNDARY<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="east-boundary"
                                type="text"
                                placeholder="Neighboring Plot Name"
                                value={data.eastBoundary}
                                onChange={(e) => updateField("eastBoundary", e.target.value)}
                            />
                        </Field>
                        <Field>
                            <FieldLabel htmlFor="west-boundary" className='text-xs -mb-1 text-gray-500'>WEST BOUNDARY<span className="text-destructive">*</span></FieldLabel>
                            <Input
                                id="west-boundary"
                                type="text"
                                placeholder="Neighboring Plot Name"
                                value={data.westBoundary}
                                onChange={(e) => updateField("westBoundary", e.target.value)}
                            />
                        </Field>
                    </div>
                </div>
            </div>

            {/* Right Sidebar */}
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

                {/* Dynamic Registration Fee */}
                <RegistrationFeeSidebar />

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

                {/* footer actions  */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <Button variant="ghost" className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-600">
                        Save Draft
                    </Button>
                    <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                        <Button variant="ghost" className="hover:cursor-pointer w-full sm:w-auto p-4 font-bold text-slate-500">
                            Cancel
                        </Button>
                        <Button onClick={handleNextStep} className="hover:cursor-pointer w-full sm:w-auto px-10 py-3 rounded-lg font-bold shadow-lg shadow-primary/25 gap-2 flex items-center">
                            Next Step
                            <ChevronRight className="size-4" />
                        </Button>
                    </div>
                </div>
            </div>

        </div>
    )
}

export default Details