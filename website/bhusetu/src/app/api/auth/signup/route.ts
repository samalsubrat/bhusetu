import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { hashPassword, generateOtp, hashOtp } from "@/lib/auth"
import { sendOtpEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, phone, role } = await req.json()

    // ── Validate ────────────────────────────────────────────────────────────
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required." },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      )
    }

    // ── Check existing user ─────────────────────────────────────────────────
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      )
    }

    // ── Create user (unverified) ────────────────────────────────────────────
    const passwordHash = await hashPassword(password)
    const validRoles = ["OWNER", "BUYER"]
    const userRole = validRoles.includes(role) ? role : "OWNER"

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        role: userRole,
        isVerified: false,
      },
    })

    // ── Generate & send OTP ─────────────────────────────────────────────────
    const otp = generateOtp()
    const otpHash = await hashOtp(otp)

    await prisma.otp.create({
      data: {
        code: otpHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      },
    })

    await sendOtpEmail({ to: email, otp, name })

    return NextResponse.json(
      {
        message: "Account created. Check your email for the verification code.",
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("[SIGNUP]", error)
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    )
  }
}
