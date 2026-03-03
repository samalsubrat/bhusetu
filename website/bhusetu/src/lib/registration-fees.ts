// ─── Processing Fee: per-sqft rate by category ───
export const CATEGORY_RATES: Record<string, number> = {
    "Residential": 5,   // ₹5 / sqft
    "Commercial": 12,  // ₹12 / sqft
    "Green Zone": 3,   // ₹3 / sqft
    "Yellow Zone": 7,   // ₹7 / sqft
    "Red Zone": 10,  // ₹10 / sqft
}

// Penalty multiplier when latest tax is NOT paid
export const TAX_PENALTY_MULTIPLIER = 1.25 // 25% surcharge

// ─── Stamp Duty: flat rate per district (Odisha sample) ───
export const DISTRICT_STAMP_DUTY: Record<string, number> = {
    "Khordha": 15000,
    "Cuttack": 13500,
    "Puri": 12000,
    "Bhubaneswar": 18000,
    "Ganjam": 10000,
    "Balasore": 9500,
    "Sambalpur": 9000,
    "Berhampur": 11000,
    "Koraput": 7500,
    "Mayurbhanj": 8000,
    "Sundargarh": 8500,
    "Angul": 9000,
    "Dhenkanal": 8500,
    "Jajpur": 9000,
    "Kendrapara": 8000,
    "Jagatsinghpur": 8500,
    "Nayagarh": 7500,
    "Boudh": 6500,
    "Kalahandi": 7000,
    "Bargarh": 7500,
    "Bolangir": 7000,
    "Nuapada": 6000,
    "Rayagada": 6500,
    "Nabarangpur": 6000,
    "Malkangiri": 5500,
    "Kandhamal": 6000,
    "Gajapati": 6000,
    "Subarnapur": 6500,
    "Jharsuguda": 8000,
    "Debagarh": 6500,
}

export const DEFAULT_STAMP_DUTY = 10000 // fallback for unknown districts

// ─── Calculators ───

export function calculateProcessingFee(
    landAreaSqft: number,
    category: string,
    taxPaid: boolean
): number {
    const rate = CATEGORY_RATES[category] ?? 5
    let fee = landAreaSqft * rate
    if (!taxPaid) fee *= TAX_PENALTY_MULTIPLIER
    return Math.round(fee)
}

export function calculateStampDuty(district: string): number {
    if (!district) return 0
    // Try exact match first, then case-insensitive
    if (DISTRICT_STAMP_DUTY[district] !== undefined) {
        return DISTRICT_STAMP_DUTY[district]
    }
    const match = Object.keys(DISTRICT_STAMP_DUTY).find(
        (d) => d.toLowerCase() === district.toLowerCase()
    )
    return match ? DISTRICT_STAMP_DUTY[match] : DEFAULT_STAMP_DUTY
}

export function formatCurrency(amount: number): string {
    if (amount === 0) return "—"
    return "₹ " + amount.toLocaleString("en-IN")
}
