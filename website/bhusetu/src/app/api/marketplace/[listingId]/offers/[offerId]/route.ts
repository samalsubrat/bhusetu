import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"

/**
 * PATCH /api/marketplace/[listingId]/offers/[offerId]
 * Accept, reject, or withdraw an offer.
 * Body: { action: "ACCEPT" | "REJECT" | "WITHDRAW" }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string; offerId: string }> }
) {
    try {
        const { listingId, offerId } = await params
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const offer = await prisma.offer.findUnique({
            where: { id: offerId },
            include: {
                listing: true,
            },
        })

        if (!offer || offer.listingId !== listingId) {
            return NextResponse.json({ error: "Offer not found" }, { status: 404 })
        }

        if (offer.status !== "PENDING") {
            return NextResponse.json(
                { error: `Cannot update offer. Current status: ${offer.status}` },
                { status: 400 }
            )
        }

        const body = await req.json()
        const { action } = body

        if (!["ACCEPT", "REJECT", "WITHDRAW"].includes(action)) {
            return NextResponse.json(
                { error: "Invalid action. Must be ACCEPT, REJECT, or WITHDRAW." },
                { status: 400 }
            )
        }

        // Ownership checks
        const isOwner = offer.listing.listedByUserId === session.userId
        const isOfferMaker = offer.offerByUserId === session.userId

        if (action === "WITHDRAW") {
            if (!isOfferMaker) {
                return NextResponse.json({ error: "Only the offer maker can withdraw" }, { status: 403 })
            }
        } else {
            // ACCEPT or REJECT
            if (!isOwner) {
                return NextResponse.json({ error: "Only the property owner can accept/reject offers" }, { status: 403 })
            }
        }

        // Map action to status
        const statusMap: Record<string, "ACCEPTED" | "REJECTED" | "WITHDRAWN"> = {
            ACCEPT: "ACCEPTED",
            REJECT: "REJECTED",
            WITHDRAW: "WITHDRAWN",
        }

        const updated = await prisma.offer.update({
            where: { id: offerId },
            data: { status: statusMap[action] },
            include: {
                offerByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        })

        return NextResponse.json({
            offer: {
                ...updated,
                amountInPaise: updated.amountInPaise.toString(),
            },
        })
    } catch (error) {
        console.error("[OFFER_PATCH]", error)
        return NextResponse.json(
            { error: "Failed to update offer" },
            { status: 500 }
        )
    }
}
