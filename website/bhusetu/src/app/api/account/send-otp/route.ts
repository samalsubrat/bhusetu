import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifySession, generateOtp, hashOtp } from "@/lib/auth"
import { sendOtpEmail } from "@/lib/email"

// ─── POST /api/account/send-otp — Send OTP for account change verification ───
export async function POST(req: NextRequest) {
    try {
        const session = verifySession(req)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = await prisma.user.findUnique({
            where: { id: session.userId },
            select: { id: true, email: true, name: true },
        })

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 })
        }

        // Invalidate all previous unused OTPs for this user
        await prisma.otp.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        })

        // Generate & store new OTP
        const otp = generateOtp()
        const otpHash = await hashOtp(otp)

        await prisma.otp.create({
            data: {
                code: otpHash,
                userId: user.id,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
        })

        // Send via email
        await sendOtpEmail({ to: user.email, otp, name: user.name })

        return NextResponse.json({ message: "Verification code sent to your email." })
    } catch (error) {
        console.error("POST /api/account/send-otp error:", error)
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
