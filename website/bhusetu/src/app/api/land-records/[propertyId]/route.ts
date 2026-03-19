import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"
import { getRecordFromChain } from "@/lib/blockchain/client"

/**
 * GET /api/land-records/[propertyId]
 * Fetches a verified land record by its BhuSetu Property ID.
 * Also attempts to fetch on-chain data for verification proof.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ propertyId: string }> }
) {
    try {
        const { propertyId } = await params
        const session = verifySession(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const registration = await prisma.registration.findUnique({
            where: { bhuSetuId: propertyId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        })

        if (!registration) {
            return NextResponse.json({ error: "Property not found" }, { status: 404 })
        }

        // Only the owner or officers can view
        const officerRoles = [
            "REVENUE_INSPECTOR",
            "ADDITIONAL_TAHASILDAR",
            "TAHASILDAR",
            "COLLECTOR",
            "ADMIN",
        ]
        if (registration.userId !== session.userId && !officerRoles.includes(session.role)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Try to fetch blockchain record
        let blockchainRecord = null
        try {
            blockchainRecord = await getRecordFromChain(propertyId)
        } catch (err) {
            console.warn("[land-records] Could not fetch blockchain record:", err)
        }

        return NextResponse.json({
            registration: {
                id: registration.id,
                bhuSetuId: registration.bhuSetuId,
                regYear: registration.regYear,
                regNumber: registration.regNumber,
                status: registration.status,
                ownerName: registration.ownerName,
                landArea: registration.landArea,
                taxPaid: registration.taxPaid,
                category: registration.category,
                northBoundary: registration.northBoundary,
                southBoundary: registration.southBoundary,
                eastBoundary: registration.eastBoundary,
                westBoundary: registration.westBoundary,
                pincode: registration.pincode,
                state: registration.state,
                district: registration.district,
                postOffice: registration.postOffice,
                tehsil: registration.tehsil,
                plotNumber: registration.plotNumber,
                documents: registration.documents,
                processingFee: registration.processingFee,
                stampDuty: registration.stampDuty,
                totalAmount: registration.totalAmount,
                createdAt: registration.createdAt,
                updatedAt: registration.updatedAt,
                user: registration.user,
            },
            blockchain: blockchainRecord,
            isOwner: registration.userId === session.userId,
        })
    } catch (error) {
        console.error("[LAND_RECORD_GET]", error)
        return NextResponse.json(
            { error: "Failed to fetch property record" },
            { status: 500 }
        )
    }
}
