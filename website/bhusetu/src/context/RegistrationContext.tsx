"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

export interface UploadedDocument {
    id: string
    cid: string
    name: string
    size: number
    mimeType: string
    category: "sale_deed" | "tax_receipt" | "identity_proof" | "other"
}

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
    // Documents step
    documents: UploadedDocument[]
}

const STORAGE_KEY = "bhusetu_registration_data"

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
    documents: [],
}

function loadFromStorage(): RegistrationData {
    if (typeof window === "undefined") return defaultData
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored) {
            const parsed = JSON.parse(stored)
            return { ...defaultData, ...parsed }
        }
    } catch {
        // Corrupted storage — start fresh
    }
    return defaultData
}

function saveToStorage(data: RegistrationData) {
    if (typeof window === "undefined") return
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
        // Storage full or inaccessible — fail silently
    }
}

// ─── Validation helpers ──────────────────────────────────────────────
export type ValidationErrors = Record<string, string>

export function validateDetailsStep(data: RegistrationData): ValidationErrors {
    const errors: ValidationErrors = {}
    if (!data.ownerName.trim()) errors.ownerName = "Owner name is required"
    if (!data.landArea.trim() || parseFloat(data.landArea) <= 0) errors.landArea = "Valid land area is required"
    if (!data.taxPaid) errors.taxPaid = "Please specify if tax is paid"
    if (!data.category) errors.category = "Category is required"
    if (!data.northBoundary.trim()) errors.northBoundary = "North boundary is required"
    if (!data.southBoundary.trim()) errors.southBoundary = "South boundary is required"
    if (!data.eastBoundary.trim()) errors.eastBoundary = "East boundary is required"
    if (!data.westBoundary.trim()) errors.westBoundary = "West boundary is required"
    return errors
}

export function validateLocationStep(data: RegistrationData): ValidationErrors {
    const errors: ValidationErrors = {}
    if (!data.pincode.trim() || data.pincode.length !== 6) errors.pincode = "Valid 6-digit PIN code is required"
    if (!data.state.trim()) errors.state = "State is required"
    if (!data.district.trim()) errors.district = "District is required"
    if (!data.postOffice.trim()) errors.postOffice = "Post office is required"
    if (!data.tehsil.trim()) errors.tehsil = "Tehsil / Village is required"
    if (!data.plotNumber.trim()) errors.plotNumber = "Plot number is required"
    return errors
}

export function validateDocumentsStep(data: RegistrationData): ValidationErrors {
    const errors: ValidationErrors = {}
    const docs = data.documents
    if (!docs.some(d => d.category === "sale_deed")) errors.sale_deed = "Sale Deed document is required"
    if (!docs.some(d => d.category === "tax_receipt")) errors.tax_receipt = "Tax Receipt document is required"
    if (!docs.some(d => d.category === "identity_proof")) errors.identity_proof = "Identity Proof (Aadhar) is required"
    return errors
}

interface RegistrationContextType {
    data: RegistrationData
    updateField: (field: keyof RegistrationData, value: string) => void
    updateFields: (fields: Partial<RegistrationData>) => void
    addDocument: (doc: UploadedDocument) => void
    removeDocument: (cid: string) => void
    clearRegistration: () => void
}

const RegistrationContext = createContext<RegistrationContextType | null>(null)

export function RegistrationProvider({ children }: { children: ReactNode }) {
    const [data, setData] = useState<RegistrationData>(defaultData)
    const [hydrated, setHydrated] = useState(false)

    // Load from localStorage on mount (client side only)
    useEffect(() => {
        setData(loadFromStorage())
        setHydrated(true)
    }, [])

    // Persist to localStorage on every change (after initial hydration)
    useEffect(() => {
        if (hydrated) {
            saveToStorage(data)
        }
    }, [data, hydrated])

    const updateField = useCallback((field: keyof RegistrationData, value: string) => {
        setData((prev) => ({ ...prev, [field]: value }))
    }, [])

    const updateFields = useCallback((fields: Partial<RegistrationData>) => {
        setData((prev) => ({ ...prev, ...fields }))
    }, [])

    const addDocument = useCallback((doc: UploadedDocument) => {
        setData((prev) => ({ ...prev, documents: [...prev.documents, doc] }))
    }, [])

    const removeDocument = useCallback((cid: string) => {
        setData((prev) => ({ ...prev, documents: prev.documents.filter(d => d.cid !== cid) }))
    }, [])

    const clearRegistration = useCallback(() => {
        setData(defaultData)
        if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEY)
        }
    }, [])

    return (
        <RegistrationContext.Provider value={{ data, updateField, updateFields, addDocument, removeDocument, clearRegistration }}>
            {children}
        </RegistrationContext.Provider>
    )
}

export function useRegistration() {
    const ctx = useContext(RegistrationContext)
    if (!ctx) throw new Error("useRegistration must be used within RegistrationProvider")
    return ctx
}
