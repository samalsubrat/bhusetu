import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession } from "@/lib/auth"
import { calculateProcessingFee, calculateStampDuty } from "@/lib/registration-fees"

// ─── GET  /api/registrations — List all registrations for the current user ───
export async function GET(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const registrations = await prisma.registration.findMany({
            where: { userId: session.userId },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                regYear: true,
                regNumber: true,
                bhuSetuId: true,
                status: true,
                paymentDeadline: true,
                ownerName: true,
                landArea: true,
                category: true,
                district: true,
                state: true,
                tehsil: true,
                plotNumber: true,
                processingFee: true,
                stampDuty: true,
                totalAmount: true,
                createdAt: true,
                updatedAt: true,
            },
        })

        return NextResponse.json({ registrations })
    } catch (error) {
        console.error("GET /api/registrations error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// ─── POST /api/registrations — Create a new registration (DRAFT) ─────────────
export async function POST(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()

        // Validate required fields
        const required = [
            "ownerName", "landArea", "taxPaid", "category",
            "northBoundary", "southBoundary", "eastBoundary", "westBoundary",
            "pincode", "state", "district", "postOffice", "tehsil", "plotNumber",
        ]
        for (const field of required) {
            if (!body[field] && body[field] !== false) {
                return NextResponse.json(
                    { error: `Missing required field: ${field}` },
                    { status: 400 }
                )
            }
        }

        const landAreaNum = parseFloat(body.landArea) || 0
        const taxPaid = body.taxPaid === "Yes" || body.taxPaid === true
        const processingFee = calculateProcessingFee(landAreaNum, body.category, taxPaid)
        const stampDuty = calculateStampDuty(body.district)
        const totalAmount = processingFee + stampDuty

        // Compute next sequential regNumber for the current year
        const regYear = new Date().getFullYear()
        const lastReg = await prisma.registration.findFirst({
            where: { regYear },
            orderBy: { regNumber: "desc" },
            select: { regNumber: true },
        })
        const regNumber = (lastReg?.regNumber ?? 0) + 1

        const registration = await prisma.registration.create({
            data: {
                userId: session.userId,
                regYear,
                regNumber,
                ownerName: body.ownerName,
                landArea: landAreaNum,
                taxPaid,
                category: body.category,
                northBoundary: body.northBoundary,
                southBoundary: body.southBoundary,
                eastBoundary: body.eastBoundary,
                westBoundary: body.westBoundary,
                pincode: body.pincode,
                state: body.state,
                district: body.district,
                postOffice: body.postOffice,
                tehsil: body.tehsil,
                plotNumber: body.plotNumber,
                documents: body.documents ?? [],
                processingFee,
                stampDuty,
                totalAmount,
                status: "DRAFT",
            },
        })

        return NextResponse.json({
            id: registration.id,
            regYear: registration.regYear,
            regNumber: registration.regNumber,
        }, { status: 201 })
    } catch (error) {
        console.error("POST /api/registrations error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
