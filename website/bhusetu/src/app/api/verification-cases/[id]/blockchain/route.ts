import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"
import { recordLandOnChain, type RecordLandInput } from "@/lib/blockchain/client"

interface UploadedDocument {
    id: string
    cid: string
    name: string
    size: number
    mimeType: string
    category: string
}

/**
 * POST /api/verification-cases/[id]/blockchain
 *
 * Triggers on-chain recording of a verified registration.
 * Only callable when status is PENDING_ADDL_TAHASILDAR and by ADDITIONAL_TAHASILDAR+.
 * This is a two-step process:
 *   1. The approve action (PATCH) sets the status to VERIFIED.
 *   2. This endpoint writes the record on-chain and stores the txHash.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params
        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Only ADDITIONAL_TAHASILDAR and above can trigger blockchain
        const allowedRoles = ["ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
        }

        const registration = await prisma.registration.findUnique({
            where: { id },
            include: {
                user: {
                    select: { name: true, email: true },
                },
            },
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found." }, { status: 404 })
        }

        // Must be PENDING_ADDL_TAHASILDAR or VERIFIED (retry case)
        if (!["PENDING_ADDL_TAHASILDAR", "VERIFIED"].includes(registration.status)) {
            return NextResponse.json(
                { error: `Cannot record on-chain. Current status: ${registration.status}` },
                { status: 400 }
            )
        }

        const bhuSetuId = registration.bhuSetuId
            ?? `BHU-${registration.regYear}-${String(registration.regNumber).padStart(5, "0")}`

        // Parse documents JSON to get CIDs
        const docs: UploadedDocument[] = Array.isArray(registration.documents)
            ? (registration.documents as any[])
            : []
        const documentCids = docs.map((d) => d.cid).filter(Boolean)

        const input: RecordLandInput = {
            bhuSetuId,
            registrationId:  registration.id,
            regYear:         registration.regYear,
            regNumber:       registration.regNumber,
            ownerName:       registration.ownerName,
            ownerEmail:      registration.user.email,
            category:        registration.category,
            landAreaSqFt:    registration.landArea,
            taxPaid:         registration.taxPaid,
            boundaries: {
                north: registration.northBoundary,
                south: registration.southBoundary,
                east:  registration.eastBoundary,
                west:  registration.westBoundary,
            },
            location: {
                state:      registration.state,
                district:   registration.district,
                tehsil:     registration.tehsil,
                postOffice: registration.postOffice,
                pincode:    registration.pincode,
                plotNumber: registration.plotNumber,
            },
            fees: {
                processingFee: registration.processingFee,
                stampDuty:     registration.stampDuty,
                totalAmount:   registration.totalAmount,
            },
            documentCids,
        }

        // Execute smart contract call
        const result = await recordLandOnChain(input)

        if (!result.success) {
            return NextResponse.json(
                { error: `Blockchain recording failed: ${result.error}` },
                { status: 502 }
            )
        }

        // Update registration as VERIFIED + bhuSetuId if not already
        await prisma.registration.update({
            where: { id },
            data: {
                status: "VERIFIED",
                bhuSetuId: bhuSetuId,
            },
        })

        return NextResponse.json({
            message:     "Successfully recorded on blockchain",
            txHash:      result.txHash,
            blockNumber: result.blockNumber,
            bhuSetuId,
        })

    } catch (error) {
        console.error("[BLOCKCHAIN_RECORD]", error)
        return NextResponse.json(
            { error: "Failed to record on blockchain." },
            { status: 500 }
        )
    }
}
