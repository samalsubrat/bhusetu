import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import {
    verifySession,
    verifyOtp,
    hashPassword,
    verifyPassword,
} from "@/lib/auth"

// ─── PATCH /api/account/update — Verify OTP, then apply account changes ──────
export async function PATCH(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json()
        const { otp, name, phone, currentPassword, newPassword } = body

        if (!otp) {
            return NextResponse.json(
                { error: "Verification code is required." },
                { status: 400 }
            )
        }

        // ── Verify OTP ───────────────────────────────────────────────────────
        const otpRecord = await prisma.otp.findFirst({
            where: {
                userId: session.userId,
                used: false,
                expiresAt: { gt: new Date() },
            },
            orderBy: { createdAt: "desc" },
        })

        if (!otpRecord) {
            return NextResponse.json(
                { error: "OTP expired or not found. Please request a new one." },
                { status: 400 }
            )
        }

        const valid = await verifyOtp(otp, otpRecord.code)
        if (!valid) {
            return NextResponse.json({ error: "Invalid OTP." }, { status: 400 })
        }

        // Mark OTP as used
        await prisma.otp.update({
            where: { id: otpRecord.id },
            data: { used: true },
        })

        // ── Build update payload ─────────────────────────────────────────────
        const updateData: Record<string, unknown> = {}

        // Name update
        if (name !== undefined) {
            const trimmed = (name as string).trim()
            if (trimmed.length < 2) {
                return NextResponse.json(
                    { error: "Name must be at least 2 characters." },
                    { status: 400 }
                )
            }
            updateData.name = trimmed
        }

        // Phone update
        if (phone !== undefined) {
            const trimmed = (phone as string).trim()
            if (trimmed && !/^\+?[0-9]{7,15}$/.test(trimmed.replace(/\s/g, ""))) {
                return NextResponse.json(
                    { error: "Invalid phone number format." },
                    { status: 400 }
                )
            }
            updateData.phone = trimmed || null
        }

        // Password change
        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json(
                    { error: "Current password is required to set a new password." },
                    { status: 400 }
                )
            }

            const user = await prisma.user.findUnique({
                where: { id: session.userId },
                select: { passwordHash: true },
            })

            if (!user) {
                return NextResponse.json({ error: "User not found." }, { status: 404 })
            }

            const passwordValid = await verifyPassword(currentPassword, user.passwordHash)
            if (!passwordValid) {
                return NextResponse.json(
                    { error: "Current password is incorrect." },
                    { status: 400 }
                )
            }

            if ((newPassword as string).length < 8) {
                return NextResponse.json(
                    { error: "New password must be at least 8 characters." },
                    { status: 400 }
                )
            }

            updateData.passwordHash = await hashPassword(newPassword)
        }

        // ── Apply updates ────────────────────────────────────────────────────
        if (Object.keys(updateData).length === 0) {
            return NextResponse.json(
                { error: "No changes to apply." },
                { status: 400 }
            )
        }

        const updatedUser = await prisma.user.update({
            where: { id: session.userId },
            data: updateData,
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                isVerified: true,
                createdAt: true,
            },
        })

        return NextResponse.json({
            message: "Account updated successfully.",
            user: updatedUser,
        })
    } catch (error) {
        console.error("PATCH /api/account/update error:", error)
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
