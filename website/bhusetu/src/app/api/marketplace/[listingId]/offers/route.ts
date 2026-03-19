import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"

/**
 * GET /api/marketplace/[listingId]/offers
 * List all offers for a listing (owner only) or own offers (non-owner).
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
        })

        if (!listing) {
            return NextResponse.json({ error: "Listing not found" }, { status: 404 })
        }

        const isOwner = listing.listedByUserId === session.userId

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { listingId }
        if (!isOwner) {
            where.offerByUserId = session.userId
        }

        const offers = await prisma.offer.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: {
                offerByUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    },
                },
            },
        })

        return NextResponse.json({
            offers: offers.map((o) => ({
                ...o,
                amountInPaise: o.amountInPaise.toString(),
            })),
            isOwner,
        })
    } catch (error) {
        console.error("[OFFERS_GET]", error)
        return NextResponse.json(
            { error: "Failed to fetch offers" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/marketplace/[listingId]/offers
 * Submit a new offer.
 * Body: { amountInRupees, message? }
 */
export async function POST(
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

        if (!listing.isActive) {
            return NextResponse.json({ error: "This listing is no longer active" }, { status: 400 })
        }

        // Owner cannot make an offer on their own property
        if (listing.listedByUserId === session.userId) {
            return NextResponse.json({ error: "You cannot make an offer on your own listing" }, { status: 400 })
        }

        const body = await req.json()
        const { amountInRupees, message } = body

        if (!amountInRupees || amountInRupees <= 0) {
            return NextResponse.json({ error: "Valid offer amount is required" }, { status: 400 })
        }

        // Check if user already has a pending offer on this listing
        const existingOffer = await prisma.offer.findFirst({
            where: {
                listingId,
                offerByUserId: session.userId,
                status: "PENDING",
            },
        })

        if (existingOffer) {
            return NextResponse.json(
                { error: "You already have a pending offer on this listing. Withdraw it first to make a new one." },
                { status: 409 }
            )
        }

        const offer = await prisma.offer.create({
            data: {
                listingId,
                offerByUserId: session.userId,
                amountInPaise: BigInt(Math.round(amountInRupees * 100)),
                message: message || null,
            },
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
                ...offer,
                amountInPaise: offer.amountInPaise.toString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error("[OFFERS_POST]", error)
        return NextResponse.json(
            { error: "Failed to create offer" },
            { status: 500 }
        )
    }
}
