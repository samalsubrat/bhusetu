import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOtp, hashOtp } from "@/lib/auth"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json(
                { error: "Email is required." },
                { status: 400 }
            )
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
        })

        if (!user) {
            return NextResponse.json(
                { error: "No account found with this email address." },
                { status: 404 }
            )
        }

        // ── Invalidate previous unused OTPs ─────────────────────────────────────
        await prisma.otp.updateMany({
            where: { userId: user.id, used: false },
            data: { used: true },
        })

        // ── Generate & send new OTP ─────────────────────────────────────────────
        const otp = generateOtp()
        const otpHash = await hashOtp(otp)

        await prisma.otp.create({
            data: {
                code: otpHash,
                userId: user.id,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            },
        })

        await sendOtpEmail({ to: user.email, otp, name: user.name })

        return NextResponse.json({ message: "An OTP has been successfully sent to your email." })
    } catch (error) {
        console.error("[FORGOT_PASSWORD_SEND_OTP]", error)
        return NextResponse.json(
            { error: "Something went wrong. Please try again." },
            { status: 500 }
        )
    }
}
