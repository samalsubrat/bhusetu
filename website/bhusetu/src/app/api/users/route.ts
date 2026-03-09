import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Role check: Only ADDITIONAL_TAHASILDAR and above can view users
        const allowedRoles = ["ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
        }

        // Retrieve users, explicitly omitting passwords
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc"
            }
        })

        return NextResponse.json({ users })

    } catch (error) {
        console.error("[GET_USERS]", error)
        return NextResponse.json(
            { error: "Failed to load users" },
            { status: 500 }
        )
    }
}
