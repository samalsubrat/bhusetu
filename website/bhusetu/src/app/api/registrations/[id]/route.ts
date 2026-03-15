import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

// ─── GET  /api/registrations/[id] — Get a single registration ────────────────
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSessionUser(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const registration = await prisma.registration.findUnique({
            where: { id },
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        // Ensure user can only access their own registrations, unless they are an officer
        const allowedOfficerRoles = ["REVENUE_INSPECTOR", "ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
        const isOfficer = allowedOfficerRoles.includes(session.role)

        if (registration.userId !== session.id && !isOfficer) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        return NextResponse.json({ registration })
    } catch (error) {
        console.error("GET /api/registrations/[id] error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

// ─── PATCH /api/registrations/[id] — Update registration status / payment ────
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSessionUser(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params
        const body = await req.json()

        const registration = await prisma.registration.findUnique({
            where: { id },
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        const allowedOfficerRoles = ["REVENUE_INSPECTOR", "ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
        const isOfficer = allowedOfficerRoles.includes(session.role)

        if (registration.userId !== session.id && !isOfficer) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // Build update payload (only allow specific fields)
        const updateData: Record<string, unknown> = {}

        if (body.status) {
            updateData.status = body.status
        }
        if (body.paymentDeadline) {
            updateData.paymentDeadline = new Date(body.paymentDeadline)
        }
        if (body.razorpayOrderId) {
            updateData.razorpayOrderId = body.razorpayOrderId
        }
        if (body.razorpayPaymentId) {
            updateData.razorpayPaymentId = body.razorpayPaymentId
        }

        const updated = await prisma.registration.update({
            where: { id },
            data: updateData,
        })

        return NextResponse.json({ registration: updated })
    } catch (error) {
        console.error("PATCH /api/registrations/[id] error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
