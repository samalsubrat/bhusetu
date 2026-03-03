"use client"

import { useMemo } from "react"
import { useRegistration } from "@/context/RegistrationContext"
import {
    calculateProcessingFee,
    calculateStampDuty,
    formatCurrency,
} from "@/lib/registration-fees"

export default function RegistrationFeeSidebar() {
    const { data } = useRegistration()

    const landAreaNum = parseFloat(data.landArea) || 0
    const taxPaid = data.taxPaid === "Yes"
    const category = data.category
    const district = data.district

    const processingFee = useMemo(
        () => calculateProcessingFee(landAreaNum, category, taxPaid),
        [landAreaNum, category, taxPaid]
    )

    const stampDuty = useMemo(
        () => calculateStampDuty(district),
        [district]
    )

    const total = processingFee + stampDuty

    const showProcessing = landAreaNum > 0 && category !== ""
    const showStamp = district !== ""

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <h3 className="font-bold text-slate-900 mb-4">Registration Fee</h3>
            <div className="space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Processing Fee</span>
                    <span className="font-semibold">
                        {showProcessing ? formatCurrency(processingFee) : "—"}
                    </span>
                </div>
                {showProcessing && !taxPaid && data.taxPaid === "No" && (
                    <p className="text-xs text-amber-600 -mt-1">
                        Includes 25% surcharge (tax unpaid)
                    </p>
                )}
                {showProcessing && (
                    <p className="text-xs text-slate-400 -mt-1">
                        {category} @ ₹{(processingFee / landAreaNum).toFixed(0)}/sqft × {landAreaNum.toLocaleString("en-IN")} sqft
                    </p>
                )}
                <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Stamp Duty (District)</span>
                    <span className="font-semibold">
                        {showStamp ? formatCurrency(stampDuty) : "—"}
                    </span>
                </div>
                {showStamp && (
                    <p className="text-xs text-slate-400 -mt-1">
                        Flat rate for {district}
                    </p>
                )}
                <div className="pt-3 border-t border-slate-100 flex justify-between">
                    <span className="font-bold text-slate-900">Total</span>
                    <span className="font-bold text-primary">
                        {showProcessing || showStamp ? formatCurrency(total) : "—"}
                    </span>
                </div>
            </div>
        </div>
    )
}
