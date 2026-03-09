import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyOtp, hashPassword } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const { email, otp, newPassword } = await req.json()

        if (!email || !otp || !newPassword) {
            return NextResponse.json(
                { error: "Email, OTP, and new password are required." },
                { status: 400 }
            )
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: "Password must be at least 8 characters." },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email },
        })

        if (!user) {
            return NextResponse.json(
                { error: "Invalid OTP or email." },
                { status: 400 }
            )
        }

        // ── Find the latest unused OTP for this user ────────────────────────────
        const otpRecord = await prisma.otp.findFirst({
            where: {
                userId: user.id,
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

        // ── Mark OTP as used & update password ──────────────────────────────────
        const passwordHash = await hashPassword(newPassword)

        await prisma.$transaction([
            prisma.otp.update({
                where: { id: otpRecord.id },
                data: { used: true },
            }),
            prisma.user.update({
                where: { id: user.id },
                data: { passwordHash, isVerified: true }, // Verify if unverified as well
            }),
        ])

        // Invalidate all active sessions for security
        await prisma.session.deleteMany({
            where: { userId: user.id }
        })

        return NextResponse.json({ message: "Password updated successfully. You can now log in with your new password." })
    } catch (error) {
        console.error("[FORGOT_PASSWORD_RESET]", error)
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
