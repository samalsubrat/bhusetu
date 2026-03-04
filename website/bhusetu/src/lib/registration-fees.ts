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

// ─── Stamp Duty: dynamic duty per district across all states ───
export function calculateStampDuty(district: string): number {
    if (!district) return 0

    // Generate a deterministic hash based on the district name (case-insensitive)
    const normalized = district.trim().toLowerCase()
    let hash = 0
    for (let i = 0; i < normalized.length; i++) {
        hash = normalized.charCodeAt(i) + ((hash << 5) - hash)
    }

    // Map the hash to a realistic stamp duty amount
    // Generate a value between ₹5,000 and ₹25,000 in increments of 500
    const minDuty = 5000
    const maxDuty = 25000
    const rangeSteps = (maxDuty - minDuty) / 500

    // Use absolute value of hash to get a positive index
    const index = Math.abs(hash) % (rangeSteps + 1)
    return minDuty + (index * 500)
}

export function formatCurrency(amount: number): string {
    if (amount === 0) return "—"
    return "₹ " + amount.toLocaleString("en-IN")
}
