import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        let statusesToFetch: string[] = []

        if (session.role === "REVENUE_INSPECTOR") {
            statusesToFetch = ["PENDING_RI_VERIFICATION"]
        } else if (session.role === "ADDITIONAL_TAHASILDAR") {
            statusesToFetch = ["PENDING_ADDL_TAHASILDAR"]
        } else if (["TAHASILDAR", "COLLECTOR", "ADMIN"].includes(session.role)) {
            statusesToFetch = ["PENDING_RI_VERIFICATION", "PENDING_ADDL_TAHASILDAR"]
        } else {
            return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
        }

        const cases = await prisma.registration.findMany({
            where: {
                status: { in: statusesToFetch as any }
            },
            include: {
                user: { select: { id: true, name: true, email: true, phone: true } }
            },
            orderBy: { createdAt: "desc" }
        })

        return NextResponse.json({ cases })

    } catch (error) {
        console.error("[GET_VERIFICATION_CASES]", error)
        return NextResponse.json(
            { error: "Failed to load verification cases" },
            { status: 500 }
        )
    }
}
