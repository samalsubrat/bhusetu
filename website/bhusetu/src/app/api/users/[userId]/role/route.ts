import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

// Defined roles that can modify roles
const allowedRoles = ["ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]

const roleHierarchy: Record<string, number> = {
    CITIZEN: 0,
    REVENUE_INSPECTOR: 1,
    ADDITIONAL_TAHASILDAR: 2,
    TAHASILDAR: 3,
    COLLECTOR: 4,
    ADMIN: 5,
}

// What roles a given actor is permitted to assign
function getAssignableRoles(actorRole: string): string[] {
    if (actorRole === "ADDITIONAL_TAHASILDAR") {
        // Addl. Tahasildar can ONLY promote a Citizen to Revenue Inspector
        return ["REVENUE_INSPECTOR"]
    }
    // All higher roles can assign any role up to (but not exceeding) their own level
    return Object.keys(roleHierarchy).filter(
        (r) => roleHierarchy[r] <= roleHierarchy[actorRole]
    )
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

        const assignable = getAssignableRoles(session.role)
        if (!assignable.includes(role)) {
            return NextResponse.json(
                { error: `Your role (${session.role}) is not permitted to assign the role '${role}'.` },
                { status: 403 }
            )
        }

        // For Addl. Tahasildar, additionally enforce the target must currently be a CITIZEN
        if (session.role === "ADDITIONAL_TAHASILDAR") {
            const targetUser = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
            if (!targetUser || targetUser.role !== "CITIZEN") {
                return NextResponse.json(
                    { error: "Addl. Tahasildar can only promote Citizens to Revenue Inspector." },
                    { status: 403 }
                )
            }
        }

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
