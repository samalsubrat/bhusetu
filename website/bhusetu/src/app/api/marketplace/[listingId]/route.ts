import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"

/**
 * GET /api/marketplace/[listingId]
 * Fetch a single listing detail with its offers.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    try {
        const { listingId } = await params
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const listing = await prisma.propertyListing.findUnique({
            where: { id: listingId },
            include: {
                registration: {
                    select: {
                        id: true,
                        bhuSetuId: true,
                        regYear: true,
                        regNumber: true,
                        ownerName: true,
                        landArea: true,
                        category: true,
                        district: true,
                        state: true,
                        tehsil: true,
                        postOffice: true,
                        plotNumber: true,
                        pincode: true,
                        northBoundary: true,
                        southBoundary: true,
                        eastBoundary: true,
                        westBoundary: true,
                    },
                },
                listedByUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                offers: {
                    orderBy: { createdAt: "desc" },
                    include: {
                        offerByUser: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
            },
        })

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 })
        }

        // Determine if the viewer is the owner
        const isOwner = listing.listedByUserId === session.userId

        // Filter offers: owner sees all, non-owner sees only their own
        const filteredOffers = isOwner
            ? listing.offers
            : listing.offers.filter((o) => o.offerByUserId === session.userId)

        return NextResponse.json({
            listing: {
                ...listing,
                listedPriceInPaise: listing.listedPriceInPaise.toString(),
                offers: filteredOffers.map((o) => ({
                    ...o,
                    amountInPaise: o.amountInPaise.toString(),
                })),
            },
            isOwner,
        })
    } catch (error) {
        console.error("[MARKETPLACE_LISTING_GET]", error)
        return NextResponse.json(
            { error: "Failed to fetch listing" },
            { status: 500 }
        )
    }
}

/**
 * PATCH /api/marketplace/[listingId]
 * Update a listing (delist, update price, etc.)
 * Body: { isActive?, listedPriceInRupees?, title?, description? }
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    try {
        const { listingId } = await params
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const listing = await prisma.propertyListing.findUnique({
            where: { id: listingId },
        })

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 })
        }

        if (listing.listedByUserId !== session.userId) {
            return NextResponse.json({ error: "Only the property owner can update this listing" }, { status: 403 })
        }

        const body = await req.json()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {}

        if (body.title !== undefined) updateData.title = body.title
        if (body.description !== undefined) updateData.description = body.description
        if (body.isActive !== undefined) updateData.isActive = body.isActive
        if (body.listedPriceInRupees !== undefined) {
            updateData.listedPriceInPaise = BigInt(Math.round(body.listedPriceInRupees * 100))
        }
        if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail
        if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone

        const updated = await prisma.propertyListing.update({
            where: { id: listingId },
            data: updateData,
        })

        return NextResponse.json({
            listing: {
                ...updated,
                listedPriceInPaise: updated.listedPriceInPaise.toString(),
            },
        })
    } catch (error) {
        console.error("[MARKETPLACE_LISTING_PATCH]", error)
        return NextResponse.json(
            { error: "Failed to update listing" },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/marketplace/[listingId]
 * Permanently remove a listing.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ listingId: string }> }
) {
    try {
        const { listingId } = await params
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const listing = await prisma.propertyListing.findUnique({
            where: { id: listingId },
        })

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 })
        }

        if (listing.listedByUserId !== session.userId) {
            return NextResponse.json({ error: "Only the owner can delete this listing" }, { status: 403 })
        }

        await prisma.propertyListing.delete({
            where: { id: listingId },
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error("[MARKETPLACE_LISTING_DELETE]", error)
        return NextResponse.json(
            { error: "Failed to delete listing" },
            { status: 500 }
        )
    }
}
