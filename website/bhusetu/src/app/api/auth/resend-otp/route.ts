import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateOtp, hashOtp } from "@/lib/auth"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required." },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, isVerified: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 })
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "Email is already verified." },
        { status: 400 }
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
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    })

    await sendOtpEmail({ to: user.email, otp, name: user.name })

    return NextResponse.json({ message: "A new OTP has been sent to your email." })
  } catch (error) {
    console.error("[RESEND_OTP]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
