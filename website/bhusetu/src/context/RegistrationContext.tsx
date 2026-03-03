"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface RegistrationData {
    // Details step
    ownerName: string
    landArea: string        // sqft as string (from input)
    taxPaid: string         // "Yes" | "No" | ""
    category: string        // "Residential" | "Commercial" | etc.
    northBoundary: string
    southBoundary: string
    eastBoundary: string
    westBoundary: string
    // Location step
    pincode: string
    state: string
    district: string
    postOffice: string
    tehsil: string
    plotNumber: string
}

const defaultData: RegistrationData = {
    ownerName: "",
    landArea: "",
    taxPaid: "",
    category: "",
    northBoundary: "",
    southBoundary: "",
    eastBoundary: "",
    westBoundary: "",
    pincode: "",
    state: "",
    district: "",
    postOffice: "",
    tehsil: "",
    plotNumber: "",
}

interface RegistrationContextType {
    data: RegistrationData
    updateField: (field: keyof RegistrationData, value: string) => void
    updateFields: (fields: Partial<RegistrationData>) => void
}

const RegistrationContext = createContext<RegistrationContextType | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<RegistrationData>(defaultData)

    const updateField = useCallback((field: keyof RegistrationData, value: string) => {
        setData((prev) => ({ ...prev, [field]: value }))
    }, [])

    const updateFields = useCallback((fields: Partial<RegistrationData>) => {
        setData((prev) => ({ ...prev, ...fields }))
    }, [])

    return (
        <RegistrationContext.Provider value={{ data, updateField, updateFields }}>
            {children}
        </RegistrationContext.Provider>
    )
}

export function useRegistration() {
    const ctx = useContext(RegistrationContext)
    if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider")
    return ctx
}
