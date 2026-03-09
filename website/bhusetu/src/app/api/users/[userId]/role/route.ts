import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

// Defined roles that can modify roles
const allowedRoles = ["ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]

// Hierarchy of roles to prevent a lower level admin from making someone a higher level admin (optional, simple check here validates role presence)
const roleHierarchy: Record<string, number> = {
    CITIZEN: 0,
    REVENUE_INSPECTOR: 1,
    ADDITIONAL_TAHASILDAR: 2,
    TAHASILDAR: 3,
    COLLECTOR: 4,
    ADMIN: 5,
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
    try {
        const resolvedParams = await params
        const { userId } = resolvedParams
        const { role } = await req.json()

        if (!role || !Object.keys(roleHierarchy).includes(role)) {
            return NextResponse.json({ error: "Invalid role specified." }, { status: 400 })
        }

        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        if (!allowedRoles.includes(session.role)) {
            return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
        }

        // Optional: Protect higher level logic. For now, assuming anyone with access can change anyone else to any role. 
        // If you want hierarchy restrictions: 
        // if(roleHierarchy[session.role] < roleHierarchy[role]) { return Forbidden }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { role: role as any },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
            }
        })

        return NextResponse.json({ message: "Role updated successfully", user: updatedUser })

    } catch (error) {
        console.error("[UPDATE_USER_ROLE]", error)
        return NextResponse.json(
            { error: "Failed to update user role." },
            { status: 500 }
        )
    }
}
