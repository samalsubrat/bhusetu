import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, getSessionUser } from "@/lib/auth"

const categoryToPropertyType = (category: string) => {
    switch (category.toLowerCase()) {
        case "residential": return "RESIDENTIAL"
        case "commercial": return "COMMERCIAL"
        case "agricultural": return "AGRICULTURAL"
        case "apartment": return "APARTMENT"
        case "villa": return "VILLA"
        case "open_plot": return "OPEN_PLOT"
        case "row_house": return "ROW_HOUSE"
        default: return "RESIDENTIAL" // Fallback
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params
        const { id } = resolvedParams
        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { action } = await req.json() // "APPROVE" | "REJECT"

        const registration = await prisma.registration.findUnique({
            where: { id }
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found." }, { status: 404 })
        }

        let nextStatus = registration.status
        let bhuSetuId: string | null = null
        const baseBhuId = `BHU-${registration.regYear}-${String(registration.regNumber).padStart(5, '0')}`

        // State machine logic
        if (session.role === "REVENUE_INSPECTOR" && registration.status === "PENDING_RI_VERIFICATION") {
            nextStatus = action === "APPROVE" ? "PENDING_ADDL_TAHASILDAR" : "REJECTED"
        } else if (session.role === "ADDITIONAL_TAHASILDAR" && registration.status === "PENDING_ADDL_TAHASILDAR") {
            if (action === "APPROVE") {
                nextStatus = "VERIFIED"
                bhuSetuId = baseBhuId
            } else {
                nextStatus = "REJECTED"
            }
        } else if (["TAHASILDAR", "COLLECTOR", "ADMIN"].includes(session.role)) {
            // Can approve or reject directly if they have admin privileges
            if (action === "APPROVE") {
                if (registration.status === "PENDING_RI_VERIFICATION") nextStatus = "PENDING_ADDL_TAHASILDAR"
                if (registration.status === "PENDING_ADDL_TAHASILDAR") {
                    nextStatus = "VERIFIED"
                    bhuSetuId = baseBhuId
                }
            } else {
                nextStatus = "REJECTED"
            }
        } else {
            return NextResponse.json({ error: "Forbidden. Cannot perform action on this state." }, { status: 403 })
        }

        // Execute state transition
        const updatedUser = await prisma.$transaction(async (tx) => {
            let updateData: any = { status: nextStatus }
            if (bhuSetuId) {
                updateData.bhuSetuId = bhuSetuId
            }

            const updatedRegistration = await tx.registration.update({
                where: { id },
                data: updateData
            })

            if (bhuSetuId && nextStatus === "VERIFIED") {
                // Minting property conceptually on db
                await tx.property.create({
                    data: {
                        bhuSetuId: bhuSetuId,
                        title: `Property (${updatedRegistration.category}) of ${updatedRegistration.ownerName}`,
                        type: categoryToPropertyType(updatedRegistration.category) as any,
                        status: "VERIFIED",
                        areaSqFt: updatedRegistration.landArea,
                        priceInPaise: BigInt(0),
                        state: updatedRegistration.state,
                        district: updatedRegistration.district,
                        taluka: updatedRegistration.tehsil,
                        village: updatedRegistration.postOffice,
                        surveyNumber: updatedRegistration.plotNumber,
                        ownerId: updatedRegistration.userId,
                    }
                })
            }
            return updatedRegistration
        })

        // Explicitly parse BigInt before creating JSON payload
        const payload = JSON.parse(
            JSON.stringify(updatedUser, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )
        )

        return NextResponse.json({ message: "Action Successful", registration: payload })

    } catch (error) {
        console.error("[UPDATE_CASE]", error)
        return NextResponse.json(
            { error: "Failed to update case." },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const resolvedParams = await params
        const { id } = resolvedParams
        const session = await getSessionUser(req)

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const registration = await prisma.registration.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                }
            }
        })

        if (!registration) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 })
        }

        const payload = JSON.parse(
            JSON.stringify(registration, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value
            )
        )

        return NextResponse.json({ registration: payload })
    } catch (error) {
        console.error("[GET_CASE]", error)
        return NextResponse.json(
            { error: "Failed to load case" },
            { status: 500 }
        )
    }
}
