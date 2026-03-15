import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check: ADDITIONAL_TAHASILDAR, TAHASILDAR, COLLECTOR, ADMIN
    const allowedRoles = ["ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
    }

    const applications = await prisma.registration.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    
    // Explicitly parse BigInt before creating JSON payload 
    const payload = JSON.parse(
        JSON.stringify(applications, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    )

    return NextResponse.json({ applications: payload })
  } catch (error) {
    console.error("[GET_ALL_APPLICATIONS]", error)
    return NextResponse.json(
      { error: "Failed to load applications" },
      { status: 500 }
    )
  }
}
