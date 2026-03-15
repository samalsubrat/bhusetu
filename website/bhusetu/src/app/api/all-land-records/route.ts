import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSessionUser } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req)
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Role check: Only REVENUE_INSPECTOR and above can view all land records
    const allowedRoles = ["REVENUE_INSPECTOR", "ADDITIONAL_TAHASILDAR", "TAHASILDAR", "COLLECTOR", "ADMIN"]
    if (!allowedRoles.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden. Insufficient permissions." }, { status: 403 })
    }

    const properties = await prisma.property.findMany({
      include: {
        owner: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    })
    
    // Explicitly parse BigInt before creating JSON payload
    const payload = JSON.parse(
        JSON.stringify(properties, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )
    )

    return NextResponse.json({ properties: payload })
  } catch (error) {
    console.error("[GET_ALL_LAND_RECORDS]", error)
    return NextResponse.json(
      { error: "Failed to load land records" },
      { status: 500 }
    )
  }
}
