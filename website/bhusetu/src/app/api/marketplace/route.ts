import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"

/**
 * GET /api/marketplace
 * Browse all active marketplace listings.
 * Optional query params: ?search=...&category=...&minPrice=...&maxPrice=...
 */
export async function GET(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { searchParams } = new URL(req.url)
        const search = searchParams.get("search") || ""
        const category = searchParams.get("category") || ""
        const minPrice = searchParams.get("minPrice")
        const maxPrice = searchParams.get("maxPrice")
        const sort = searchParams.get("sort") || "newest" // newest, price_asc, price_desc

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = { isActive: true }

        // Search by title, description, or location
        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { registration: { district: { contains: search, mode: "insensitive" } } },
                { registration: { state: { contains: search, mode: "insensitive" } } },
                { registration: { tehsil: { contains: search, mode: "insensitive" } } },
                { registration: { bhuSetuId: { contains: search, mode: "insensitive" } } },
            ]
        }

        // Category filter
        if (category && category !== "all") {
            where.registration = { ...where.registration, category: { equals: category, mode: "insensitive" } }
        }

        // Price range
        if (minPrice) {
            where.listedPriceInPaise = { ...where.listedPriceInPaise, gte: BigInt(minPrice) * BigInt(100) }
        }
        if (maxPrice) {
            where.listedPriceInPaise = { ...where.listedPriceInPaise, lte: BigInt(maxPrice) * BigInt(100) }
        }

        // Sorting
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let orderBy: any = { listedAt: "desc" }
        if (sort === "price_asc") orderBy = { listedPriceInPaise: "asc" }
        else if (sort === "price_desc") orderBy = { listedPriceInPaise: "desc" }
        else if (sort === "oldest") orderBy = { listedAt: "asc" }

        const listings = await prisma.propertyListing.findMany({
            where,
            orderBy,
            include: {
                registration: {
                    select: {
                        id: true,
                        bhuSetuId: true,
                        ownerName: true,
                        landArea: true,
                        category: true,
                        district: true,
                        state: true,
                        tehsil: true,
                        plotNumber: true,
                        pincode: true,
                    },
                },
                listedByUser: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: { offers: true },
                },
            },
        })

        // Serialize BigInt
        const serialized = listings.map((l) => ({
            ...l,
            listedPriceInPaise: l.listedPriceInPaise.toString(),
            offersCount: l._count.offers,
            _count: undefined,
        }))

        return NextResponse.json({ listings: serialized })
    } catch (error) {
        console.error("[MARKETPLACE_GET]", error)
        return NextResponse.json(
            { error: "Failed to fetch listings" },
            { status: 500 }
        )
    }
}

/**
 * POST /api/marketplace
 * Create a new listing from a verified registration.
 * Body: { registrationId, title, description, listedPriceInRupees, contactEmail?, contactPhone? }
 */
export async function POST(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { registrationId, title, description, listedPriceInRupees, contactEmail, contactPhone } = body

        if (!registrationId || !title || !listedPriceInRupees) {
            return NextResponse.json(
                { error: "Missing required fields: registrationId, title, listedPriceInRupees" },
                { status: 400 }
            )
        }

        // Verify the registration exists and belongs to the user
        const registration = await prisma.registration.findUnique({
            where: { id: registrationId },
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        if (registration.userId !== session.userId) {
            return NextResponse.json({ error: "You can only list your own properties" }, { status: 403 })
        }

        if (registration.status !== "VERIFIED") {
            return NextResponse.json(
                { error: "Only verified properties can be listed on the marketplace" },
                { status: 400 }
            )
        }

        // Check if there's already an active listing for this registration
        const existingListing = await prisma.propertyListing.findFirst({
            where: {
                registrationId,
                isActive: true,
            },
        })

        if (existingListing) {
            return NextResponse.json(
                { error: "This property already has an active listing" },
                { status: 409 }
            )
        }

        const listing = await prisma.propertyListing.create({
            data: {
                registrationId,
                listedByUserId: session.userId,
                title,
                description: description || null,
                listedPriceInPaise: BigInt(Math.round(listedPriceInRupees * 100)),
                contactEmail: contactEmail || null,
                contactPhone: contactPhone || null,
            },
        })

        return NextResponse.json({
            listing: {
                ...listing,
                listedPriceInPaise: listing.listedPriceInPaise.toString(),
            },
        }, { status: 201 })
    } catch (error) {
        console.error("[MARKETPLACE_POST]", error)
        return NextResponse.json(
            { error: "Failed to create listing" },
            { status: 500 }
        )
    }
}
